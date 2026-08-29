const { query, getClient } = require('../config/database');

class NavigationModel {
  static async getAllNavigations(adminOnly = false) {
    const visibleCondition = adminOnly ? '' : 'WHERE is_visible = TRUE AND is_active = TRUE';
    const sql = `
      SELECT id, label, url, parent_id, menu_type, display_order, is_visible, is_active, open_in_new_tab, icon 
      FROM navigation_menus
      ${visibleCondition}
      ORDER BY parent_id NULLS FIRST, display_order ASC
    `;
    const result = await query(sql);
    return result.rows;
  }

  static async getNavigationById(id) {
    const sql = `SELECT * FROM navigation_menus WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async createNavigation(data) {
    const sql = `
      INSERT INTO navigation_menus (label, url, parent_id, menu_type, display_order, is_visible, is_active, open_in_new_tab, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      data.label, data.url || null, data.parent_id || null, data.menu_type || 'link',
      data.display_order || 0, data.is_visible !== false, data.is_active !== false,
      data.open_in_new_tab || false, data.icon || null
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async updateNavigation(id, data) {
    const sql = `
      UPDATE navigation_menus 
      SET label = $1, url = $2, parent_id = $3, menu_type = $4, display_order = $5, 
          is_visible = $6, is_active = $7, open_in_new_tab = $8, icon = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;
    const values = [
      data.label, data.url || null, data.parent_id || null, data.menu_type || 'link',
      data.display_order || 0, data.is_visible !== false, data.is_active !== false,
      data.open_in_new_tab || false, data.icon || null, id
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async deleteNavigation(id) {
    const sql = `DELETE FROM navigation_menus WHERE id = $1 RETURNING id`;
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  static async updateDisplayOrders(updates) {
    // updates is an array of { id, display_order }
    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const update of updates) {
        await client.query('UPDATE navigation_menus SET display_order = $1 WHERE id = $2', [update.display_order, update.id]);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = NavigationModel;
