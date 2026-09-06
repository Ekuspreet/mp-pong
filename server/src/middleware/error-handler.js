export function createErrorHandler(logger) {
  return (error, request, response, next) => {
    logger.error(
      {
        err: error,
        requestId: request.id,
        method: request.method,
        path: request.originalUrl,
        status: error.status ?? 500,
      },
      'Request failed',
    )
    if (response.headersSent) return next(error)
    response.status(error.status ?? 500).json({
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: error.status ? error.message : 'Unexpected server error',
      },
    })
  }
}
