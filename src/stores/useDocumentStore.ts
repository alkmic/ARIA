/**
 * Store pour les documents d'entreprise (RAG)
 * Persiste dans localStorage pour simulation de backend
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RAGDocument, RAGChunk } from '../services/ragService';

interface DocumentStoreState {
  documents: RAGDocument[];
  chunks: RAGChunk[];

  // Actions
  addDocument: (doc: RAGDocument, chunks: RAGChunk[]) => void;
  removeDocument: (docId: string) => void;
  getDocumentChunks: (docId: string) => RAGChunk[];
  getAllChunks: () => RAGChunk[];
  clearAll: () => void;
}

export const useDocumentStore = create<DocumentStoreState>()(
  persist(
    (set, get) => ({
      documents: [],
      chunks: [],

      addDocument: (doc, newChunks) => {
        set(state => ({
          documents: [doc, ...state.documents],
          chunks: [...state.chunks, ...newChunks],
        }));
      },

      removeDocument: (docId) => {
        set(state => ({
          documents: state.documents.filter(d => d.id !== docId),
          chunks: state.chunks.filter(c => c.documentId !== docId),
        }));
      },

      getDocumentChunks: (docId) => {
        return get().chunks.filter(c => c.documentId === docId);
      },

      getAllChunks: () => get().chunks,

      clearAll: () => {
        set({ documents: [], chunks: [] });
      },
    }),
    {
      name: 'aria-documents',
      version: 1,
    }
  )
);
