// Request logger middleware
function requestLogger(req, res, next) {
  console.log(`🌍 ${req.method} ${req.originalUrl}`);
  
  // Log specific endpoints
  if (req.originalUrl.includes('/ims/check-permission')) {
    console.log('🔍 PERMISSION CHECK REQUEST DETECTED!');
  }
  
  if (req.originalUrl.includes('/finalize')) {
    console.log('🚨 FINALIZE REQUEST DETECTED!');
    console.log('🚨 Method:', req.method);
    console.log('🚨 URL:', req.originalUrl);
    console.log('🚨 Body:', req.body);
  }
  
  next();
}

module.exports = requestLogger;
