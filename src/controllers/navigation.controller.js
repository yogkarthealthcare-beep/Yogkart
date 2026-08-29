const NavigationModel = require('../models/navigation.model');

/** Helper to build tree structure */
const buildTree = (items, parentId = null) => {
  return items
    .filter(item => item.parent_id === parentId)
    .sort((a, b) => a.display_order - b.display_order)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id)
    }));
};

exports.getPublicNavigations = async (req, res) => {
  try {
    const menus = await NavigationModel.getAllNavigations(false);
    const tree = buildTree(menus, null);
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching public navigation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAdminNavigations = async (req, res) => {
  try {
    const menus = await NavigationModel.getAllNavigations(true);
    res.json({ success: true, data: menus }); // send flat for admin table, or tree if needed. sending flat for easy management.
  } catch (error) {
    console.error('Error fetching admin navigation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createMenu = async (req, res) => {
  try {
    const newMenu = await NavigationModel.createNavigation(req.body);
    res.status(201).json({ success: true, data: newMenu });
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMenu = await NavigationModel.updateNavigation(id, req.body);
    if (!updatedMenu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    res.json({ success: true, data: updatedMenu });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NavigationModel.deleteNavigation(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    res.json({ success: true, message: 'Menu deleted' });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.reorderMenus = async (req, res) => {
  try {
    const { updates } = req.body; // array of { id, display_order }
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Invalid updates payload' });
    }
    await NavigationModel.updateDisplayOrders(updates);
    res.json({ success: true, message: 'Orders updated' });
  } catch (error) {
    console.error('Error reordering menus:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
