const { AppError } = require('./error/code');
const { getSafeApiErrorMessage } = require('./safe-error-message');

/**
 * route-handler 共用錯誤回應：AppError 照實回傳，其餘一律 500 + 安全訊息
 */
function sendError(res, error) {
    if (error instanceof AppError) {
        return res.status(error.status).json({
            status: 'error',
            code: error.code,
            message: error.message,
        });
    }
    console.error(error);
    return res
        .status(500)
        .json({ status: 'error', message: getSafeApiErrorMessage(error) });
}

module.exports = { sendError };
