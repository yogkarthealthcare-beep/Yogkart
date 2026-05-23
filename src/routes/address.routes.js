const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefault
} = require('../controllers/address.controller');

// Sab routes protected hain — login zaroori hai
router.use(protect);

router.get('/',              getAddresses);   // GET    /api/addresses
router.post('/',             addAddress);     // POST   /api/addresses
router.put('/:id',           updateAddress);  // PUT    /api/addresses/:id
router.delete('/:id',        deleteAddress);  // DELETE /api/addresses/:id
router.patch('/:id/default', setDefault);     // PATCH  /api/addresses/:id/default

module.exports = router;