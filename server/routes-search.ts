import { Router } from "express";
import { storage } from "./storage";
import { insertSavedSearchSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/saved-searches", async (_req, res) => {
  const searches = await storage.getSavedSearches();
  res.json(searches);
});

router.post("/saved-searches", async (req, res) => {
  try {
    const data = insertSavedSearchSchema.parse(req.body);
    const search = await storage.createSavedSearch(data);
    res.json(search);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
    } else {
      res.status(500).json({ error: "Failed to save search" });
    }
  }
});

router.delete("/saved-searches/:id", async (req, res) => {
  await storage.deleteSavedSearch(Number(req.params.id));
  res.status(204).send();
});

export default router;
