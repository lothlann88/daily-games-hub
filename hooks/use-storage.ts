import { useState, useEffect, useCallback } from "react";
import { Game, Player, Score, Preferences } from "@/types";
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

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    const data = await storage.getPlayers();
    setPlayers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<Player>) => {
    await storage.updatePlayer(playerId, updates);
    await loadPlayers();
  }, [loadPlayers]);

  return { players, loading, updatePlayer, refresh: loadPlayers };
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

  const getScoresByPlayer = useCallback(async (playerId: string) => {
    return await storage.getScoresByPlayer(playerId);
  }, []);

  return { scores, loading, addScore, getScoresByGame, getScoresByPlayer, refresh: loadScores };
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
