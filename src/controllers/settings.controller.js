const SettingsModel = require('../models/settings.model');

exports.getPublicSettings = async (req, res) => {
  try {
    // Return safe settings for public pages
    const announcement_bar = await SettingsModel.getSetting('announcement_bar');
    const product_page_settings = await SettingsModel.getSetting('product_page_settings');
    res.json({ 
      success: true, 
      data: { announcement_bar, product_page_settings } 
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAllSettings = async (req, res) => {
  try {
    const settings = await SettingsModel.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value, description } = req.body;
    
    if (!setting_value) {
      return res.status(400).json({ success: false, message: 'setting_value is required' });
    }
    
    const updated = await SettingsModel.updateSetting(key, setting_value, description);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
