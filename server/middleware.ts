/**
 * Express middleware for robustness and security
 */

import { Request, Response, NextFunction } from "express";

/**
 * Request validation middleware - prevent oversized requests
 */
export function requestValidator(req: Request, res: Response, next: NextFunction) {
  // Limit large FASTA files (10MB max for safety on remote servers)
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: "Request entity too large",
      message: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
    });
  }

  next();
}

/**
 * Health check endpoint for remote monitoring
 */
export function healthCheck(req: Request, res: Response) {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}

/**
 * Graceful error response with stack trace in development
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("[ERROR]", {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== "production";

  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Database connection error handler
 * Helps diagnose remote connection issues
 */
export function handleDatabaseError(err: any) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    message: err.message,
    code: err.code,
  };

  // Common remote connection errors
  if (err.code === "ECONNREFUSED") {
    console.error(
      "[DB ERROR] Connection refused - database may be unreachable",
      errorInfo
    );
  } else if (err.code === "ENOTFOUND") {
    console.error(
      "[DB ERROR] Host not found - check DATABASE_URL",
      errorInfo
    );
  } else if (err.code === "ETIMEDOUT") {
    console.error("[DB ERROR] Connection timeout - network issue?", errorInfo);
  } else if (err.code === "EACCES") {
    console.error("[DB ERROR] Permission denied - check credentials", errorInfo);
  } else {
    console.error("[DB ERROR]", errorInfo);
  }

  throw err;
}
