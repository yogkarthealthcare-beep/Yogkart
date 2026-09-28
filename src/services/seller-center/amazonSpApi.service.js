const {
  getAmazonCredentials,
  updateAmazonConnectionStatus,
} = require('./amazonCredentials.service');

// In-memory token cache to prevent redundant LWA calls
let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

/**
 * Exchange LWA Refresh Token for a temporary SP-API Access Token.
 */
const getLwaAccessToken = async (credentials) => {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const tokenUrl = 'https://api.amazon.com/auth/o2/token';
  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = 'Failed to authenticate with Amazon LWA';
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error_description || errObj.error || parsedErr;
    } catch {}
    const error = new Error(`Amazon LWA Authentication Error: ${parsedErr}`);
    error.status = 401;
    throw error;
  }

  const tokenData = await response.json();
  const expiresInMs = (tokenData.expires_in || 3600) * 1000;

  tokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: now + expiresInMs,
  };

  return tokenCache.accessToken;
};

/**
 * Perform a generic SP-API Request with Access Token & Error Handling.
 */
const spApiRequest = async (credentials, path, options = {}) => {
  const accessToken = await getLwaAccessToken(credentials);
  const baseUrl = (credentials.endpoint || 'https://sellingpartnerapi-eu.amazon.com').replace(/\/$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;

  const headers = {
    'x-amz-access-token': accessToken,
    'User-Agent': 'YogkartSellerCenter/1.0 (Language=JavaScript)',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let safeMessage = `SP-API Error (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.errors && parsed.errors.length) {
        safeMessage = parsed.errors.map(e => e.message || e.code).join('; ');
      }
    } catch {}
    const error = new Error(safeMessage);
    error.status = response.status;
    throw error;
  }

  return await response.json();
};

/**
 * Test SP-API Connection and verify credentials.
 */
const testConnection = async () => {
  const credentials = await getAmazonCredentials({ requireConfigured: true });

  try {
    // 1. Verify LWA Token Exchange
    const accessToken = await getLwaAccessToken(credentials);
    if (!accessToken) {
      throw new Error('Could not obtain Amazon access token');
    }

    // 2. Call Marketplace Participations or Orders endpoint to verify API permissions
    let participationInfo = null;
    try {
      const participations = await spApiRequest(credentials, '/sellers/v1/marketplaceParticipations');
      participationInfo = participations?.payload || participations;
    } catch (apiErr) {
      // If sellers API isn't authorized, try lightweight orders call
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await spApiRequest(
        credentials,
        `/orders/v0/orders?MarketplaceIds=${encodeURIComponent(credentials.marketplaceId)}&CreatedAfter=${encodeURIComponent(thirtyDaysAgo)}&MaxResultsPerPage=1`
      );
    }

    await updateAmazonConnectionStatus('CONNECTED', null);

    return {
      success: true,
      message: 'Amazon SP-API connection verified successfully',
      marketplaceId: credentials.marketplaceId,
      region: credentials.region,
      accountName: credentials.accountName,
      testedAt: new Date().toISOString(),
      participations: participationInfo,
    };
  } catch (err) {
    const cleanError = err.message || 'Amazon SP-API connection failed';
    await updateAmazonConnectionStatus('ERROR', cleanError);
    return {
      success: false,
      message: cleanError,
      testedAt: new Date().toISOString(),
    };
  }
};

/**
 * Fetch Orders from Amazon SP-API.
 */
const fetchOrdersFromAmazon = async (credentials, { createdAfter, lastUpdatedAfter, nextToken } = {}) => {
  let queryParams = new URLSearchParams();
  queryParams.append('MarketplaceIds', credentials.marketplaceId || 'A21TJRUUN4KGV');

  if (nextToken) {
    queryParams.append('NextToken', nextToken);
  } else {
    if (lastUpdatedAfter) {
      queryParams.append('LastUpdatedAfter', new Date(lastUpdatedAfter).toISOString());
    } else if (createdAfter) {
      queryParams.append('CreatedAfter', new Date(createdAfter).toISOString());
    } else {
      // Default: fetch orders from past 90 days if first sync
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      queryParams.append('CreatedAfter', ninetyDaysAgo);
    }
    queryParams.append('MaxResultsPerPage', '50');
  }

  const endpoint = `/orders/v0/orders?${queryParams.toString()}`;
  const response = await spApiRequest(credentials, endpoint);
  return {
    orders: response?.payload?.Orders || response?.Orders || [],
    nextToken: response?.payload?.NextToken || response?.NextToken || null,
  };
};

/**
 * Fetch Order Items for a specific Amazon Order.
 */
const fetchOrderItemsFromAmazon = async (credentials, amazonOrderId) => {
  try {
    const endpoint = `/orders/v0/orders/${encodeURIComponent(amazonOrderId)}/orderItems`;
    const response = await spApiRequest(credentials, endpoint);
    return response?.payload?.OrderItems || response?.OrderItems || [];
  } catch (err) {
    console.warn(`Could not fetch order items for Amazon order ${amazonOrderId}:`, err.message);
    return [];
  }
};

module.exports = {
  getLwaAccessToken,
  testConnection,
  fetchOrdersFromAmazon,
  fetchOrderItemsFromAmazon,
  spApiRequest,
};
