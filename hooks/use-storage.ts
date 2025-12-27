import { useState, useEffect, useCallback } from "react";
import { Game, UserProfile, Score, Preferences } from "@/types";
import * as storage from "@/lib/storage";

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGames = useCallback(async () => {
    setLoading(true);
    const data = await storage.getGames();
    setGames(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const addGame = useCallback(async (game: Game) => {
    await storage.addGame(game);
    await loadGames();
  }, [loadGames]);

  const updateGame = useCallback(async (gameId: string, updates: Partial<Game>) => {
    await storage.updateGame(gameId, updates);
    await loadGames();
  }, [loadGames]);

  const deleteGame = useCallback(async (gameId: string) => {
    await storage.deleteGame(gameId);
    await loadGames();
  }, [loadGames]);

  return { games, loading, addGame, updateGame, deleteGame, refresh: loadGames };
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const data = await storage.getUserProfile();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(async (newProfile: UserProfile) => {
    await storage.saveUserProfile(newProfile);
    setProfile(newProfile);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    await storage.updateUserProfile(updates);
    await loadProfile();
  }, [loadProfile]);

  return { profile, loading, saveProfile, updateProfile, refresh: loadProfile };
}

export function useScores() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScores = useCallback(async () => {
    setLoading(true);
    const data = await storage.getScores();
    setScores(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const addScore = useCallback(async (score: Score) => {
    await storage.addScore(score);
    await loadScores();
  }, [loadScores]);

  const getScoresByGame = useCallback(async (gameId: string) => {
    return await storage.getScoresByGame(gameId);
  }, []);

  return { scores, loading, addScore, getScoresByGame, refresh: loadScores };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    const data = await storage.getPreferences();
    setPreferences(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<Preferences>) => {
    if (!preferences) return;
    const updated = { ...preferences, ...updates };
    await storage.savePreferences(updated);
    setPreferences(updated);
  }, [preferences]);

  return { preferences, loading, updatePreferences, refresh: loadPreferences };
}
