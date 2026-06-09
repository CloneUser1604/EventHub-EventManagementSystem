
const { body, validationResult } = require('express-validator');
const { validationErrorResponse } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return validationErrorResponse(res, formatted);
  }
  next();
};

// ─── Chỉ 2 role được phép đăng ký: Participant | Organizer ────
const registerRules = [
  body('fullName')
    .trim().notEmpty().withMessage('Họ tên không được để trống')
    .isLength({ min: 2, max: 150 }).withMessage('Họ tên phải từ 2–150 ký tự'),

  body('email')
    .trim().notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống')
    .isLength({ min: 8 }).withMessage('Mật khẩu phải ít nhất 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số'),

  // Chỉ cho phép Participant hoặc Organizer
  body('role')
    .optional()
    .isIn(['Participant', 'Organizer'])
    .withMessage('Role không hợp lệ. Chỉ được chọn: Người tham dự hoặc Ban tổ chức'),

  body('phone')
    .optional()
    .matches(/^(0|\+84)[0-9]{8,10}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  // Organizer bắt buộc nhập tên tổ chức
  body('organizationName')
    .if(body('role').equals('Organizer'))
    .notEmpty().withMessage('Vui lòng nhập tên tổ chức / CLB'),
];

const loginRules = [
  body('email')
    .trim().notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
];

const forgotPasswordRules = [
  body('email')
    .trim().notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Token không hợp lệ'),
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống')
    .isLength({ min: 8 }).withMessage('Mật khẩu phải ít nhất 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số'),
  body('confirmPassword')
    .notEmpty().withMessage('Xác nhận mật khẩu không được để trống')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Mật khẩu xác nhận không khớp');
      return true;
    }),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
  body('newPassword')
    .notEmpty().withMessage('Mật khẩu mới không được để trống')
    .isLength({ min: 8 }).withMessage('Mật khẩu phải ít nhất 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
      return true;
    }),
];

// ─── Speaker: Organizer tạo trong event ───────────────────────
const createSpeakerRules = [
  body('fullName')
    .trim().notEmpty().withMessage('Họ tên diễn giả không được để trống')
    .isLength({ min: 2, max: 150 }).withMessage('Họ tên phải từ 2–150 ký tự'),
  body('email')
    .trim().notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('bio').optional().isLength({ max: 2000 }).withMessage('Bio tối đa 2000 ký tự'),
  body('expertise').optional().isLength({ max: 500 }).withMessage('Expertise tối đa 500 ký tự'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
  createSpeakerRules,
};
