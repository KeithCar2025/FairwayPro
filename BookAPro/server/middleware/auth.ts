// middleware/auth.ts
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!(req.session as any)?.userId)
    return res.status(401).json({ error: "Not authenticated" });
  req.user = { id: (req.session as any).userId };
  next();
};
