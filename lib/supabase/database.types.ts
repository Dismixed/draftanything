export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ag_country_aliases: {
        Row: {
          alias: string
          cca3: string
          created_at: string
          id: string
        }
        Insert: {
          alias: string
          cca3: string
          created_at?: string
          id?: string
        }
        Update: {
          alias?: string
          cca3?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      ag_puzzle_attempts: {
        Row: {
          clues_revealed: number
          completed: boolean
          correct: boolean
          created_at: string
          guesses: number
          guest_id: string | null
          id: string
          mode: string
          puzzle_id: string
          score: number
          surrendered: boolean
          user_id: string | null
        }
        Insert: {
          clues_revealed?: number
          completed?: boolean
          correct?: boolean
          created_at?: string
          guesses?: number
          guest_id?: string | null
          id?: string
          mode: string
          puzzle_id: string
          score?: number
          surrendered?: boolean
          user_id?: string | null
        }
        Update: {
          clues_revealed?: number
          completed?: boolean
          correct?: boolean
          created_at?: string
          guesses?: number
          guest_id?: string | null
          id?: string
          mode?: string
          puzzle_id?: string
          score?: number
          surrendered?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_puzzle_attempts_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "ag_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_puzzles: {
        Row: {
          alt_answers: Json
          answer: string
          answer_id: string | null
          answer_type: string
          clues: Json
          created_at: string
          created_by: string | null
          difficulty: string
          flag_url: string | null
          id: string
          metadata: Json
          notes: string | null
          region: string | null
          score: number
          status: string
          updated_at: string
        }
        Insert: {
          alt_answers?: Json
          answer: string
          answer_id?: string | null
          answer_type?: string
          clues: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          flag_url?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          region?: string | null
          score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          alt_answers?: Json
          answer?: string
          answer_id?: string | null
          answer_type?: string
          clues?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          flag_url?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          region?: string | null
          score?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ag_seed_entries: {
        Row: {
          cca3: string
          clue_type: string
          country_common: string
          created_at: string
          id: string
          image_candidates: Json
          notes: string | null
          proposed_by: string | null
          selected_candidate_index: number
          status: string
          text_content: string | null
          updated_at: string
          vision_notes: string | null
          vision_pass: boolean | null
          wiki_title: string | null
        }
        Insert: {
          cca3: string
          clue_type: string
          country_common: string
          created_at?: string
          id?: string
          image_candidates?: Json
          notes?: string | null
          proposed_by?: string | null
          selected_candidate_index?: number
          status?: string
          text_content?: string | null
          updated_at?: string
          vision_notes?: string | null
          vision_pass?: boolean | null
          wiki_title?: string | null
        }
        Update: {
          cca3?: string
          clue_type?: string
          country_common?: string
          created_at?: string
          id?: string
          image_candidates?: Json
          notes?: string | null
          proposed_by?: string | null
          selected_candidate_index?: number
          status?: string
          text_content?: string | null
          updated_at?: string
          vision_notes?: string | null
          vision_pass?: boolean | null
          wiki_title?: string | null
        }
        Relationships: []
      }
      arguments: {
        Row: {
          defense_text: string | null
          draft_id: string
          id: string
          player_id: string
          skipped: boolean
          submitted_at: string
        }
        Insert: {
          defense_text?: string | null
          draft_id: string
          id?: string
          player_id: string
          skipped?: boolean
          submitted_at?: string
        }
        Update: {
          defense_text?: string | null
          draft_id?: string
          id?: string
          player_id?: string
          skipped?: boolean
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arguments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_dead_leaderboard: {
        Row: {
          correct: number
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          is_legacy: boolean
          play_date: string
          score: number
          user_id: string | null
        }
        Insert: {
          correct: number
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date: string
          score: number
          user_id?: string | null
        }
        Update: {
          correct?: number
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_dead_leaderboard_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_dead_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_freezeframes_puzzles: {
        Row: {
          created_at: string
          id: string
          publish_date: string
          puzzle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publish_date: string
          puzzle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publish_date?: string
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_freezeframes_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "freezeframes_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_getting_warmer_puzzles: {
        Row: {
          created_at: string
          id: string
          publish_date: string
          puzzle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publish_date: string
          puzzle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publish_date?: string
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_getting_warmer_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "getting_warmer_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      ball_knowledge_leaderboard: {
        Row: {
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          is_legacy: boolean
          play_date: string
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date: string
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ball_knowledge_leaderboard_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ball_knowledge_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      getting_warmer_leaderboard: {
        Row: {
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          is_legacy: boolean
          play_date: string
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date: string
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "getting_warmer_leaderboard_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "getting_warmer_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      getting_warmer_puzzles: {
        Row: {
          answer: string
          clues: Json
          created_at: string
          id: string
          status: string
        }
        Insert: {
          answer: string
          clues?: Json
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          answer?: string
          clues?: Json
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      freezeframes_leaderboard: {
        Row: {
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          is_legacy: boolean
          play_date: string
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date: string
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          is_legacy?: boolean
          play_date?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freezeframes_leaderboard_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freezeframes_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freezeframes_puzzles: {
        Row: {
          album: Json
          created_at: string
          id: string
          movie: Json
          show: Json
          song: Json
          status: string
        }
        Insert: {
          album: Json
          created_at?: string
          id?: string
          movie: Json
          show: Json
          song: Json
          status?: string
        }
        Update: {
          album?: Json
          created_at?: string
          id?: string
          movie?: Json
          show?: Json
          song?: Json
          status?: string
        }
        Relationships: []
      }
      freezeframes_seed_entries: {
        Row: {
          album_name: string | null
          answer: string | null
          artist: string | null
          audio: string | null
          created_at: string
          external_id: string | null
          external_source: string | null
          hint: string | null
          id: string
          img: string | null
          metadata: Json
          notes: string | null
          puzzle_id: string | null
          query_title: string
          resolve_notes: string | null
          round_key: string
          status: string
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          answer?: string | null
          artist?: string | null
          audio?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          hint?: string | null
          id?: string
          img?: string | null
          metadata?: Json
          notes?: string | null
          puzzle_id?: string | null
          query_title: string
          resolve_notes?: string | null
          round_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          answer?: string | null
          artist?: string | null
          audio?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          hint?: string | null
          id?: string
          img?: string | null
          metadata?: Json
          notes?: string | null
          puzzle_id?: string | null
          query_title?: string
          resolve_notes?: string | null
          round_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freezeframes_seed_entries_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "freezeframes_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_takes_categories: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          proposed_by: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          proposed_by?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          proposed_by?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hot_takes_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_candidates: Json
          image_source: string | null
          image_url: string | null
          label: string
          notes: string | null
          selected_candidate_index: number
          slug: string
          sort_order: number
          status: string
          updated_at: string
          wiki_title: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_candidates?: Json
          image_source?: string | null
          image_url?: string | null
          label: string
          notes?: string | null
          selected_candidate_index?: number
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
          wiki_title?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_candidates?: Json
          image_source?: string | null
          image_url?: string | null
          label?: string
          notes?: string | null
          selected_candidate_index?: number
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
          wiki_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hot_takes_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hot_takes_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_takes_schedule: {
        Row: {
          category_id: string
          created_at: string
          id: string
          publish_date: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          publish_date: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          publish_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_takes_schedule_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hot_takes_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_phrases: {
        Row: {
          category: string | null
          commonness_score: number
          created_at: string
          id: string
          is_active: boolean
          phrase: string
          source: string | null
          word_a: string
          word_b: string
        }
        Insert: {
          category?: string | null
          commonness_score?: number
          created_at?: string
          id?: string
          is_active?: boolean
          phrase: string
          source?: string | null
          word_a: string
          word_b: string
        }
        Update: {
          category?: string | null
          commonness_score?: number
          created_at?: string
          id?: string
          is_active?: boolean
          phrase?: string
          source?: string | null
          word_a?: string
          word_b?: string
        }
        Relationships: []
      }
      chain_puzzle_attempts: {
        Row: {
          completed: boolean
          created_at: string
          guest_id: string | null
          id: string
          mode: string
          puzzle_id: string
          score: number
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          guest_id?: string | null
          id?: string
          mode: string
          puzzle_id: string
          score?: number
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          guest_id?: string | null
          id?: string
          mode?: string
          puzzle_id?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_puzzle_attempts_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "chain_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_puzzles: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          notes: string | null
          phrases: Json
          score: number
          status: string
          theme: string | null
          title: string | null
          updated_at: string
          words: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          notes?: string | null
          phrases: Json
          score?: number
          status?: string
          theme?: string | null
          title?: string | null
          updated_at?: string
          words: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          notes?: string | null
          phrases?: Json
          score?: number
          status?: string
          theme?: string | null
          title?: string | null
          updated_at?: string
          words?: Json
        }
        Relationships: []
      }
      commentary: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          idempotency_key: string
          model: string
          personality: Database["public"]["Enums"]["ai_personality"]
          pick_id: string | null
          prompt_version: string
          text: string
          trigger_tags: string[]
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          idempotency_key: string
          model: string
          personality: Database["public"]["Enums"]["ai_personality"]
          pick_id?: string | null
          prompt_version: string
          text: string
          trigger_tags?: string[]
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          idempotency_key?: string
          model?: string
          personality?: Database["public"]["Enums"]["ai_personality"]
          pick_id?: string | null
          prompt_version?: string
          text?: string
          trigger_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "commentary_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "safe_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_ag_puzzles: {
        Row: {
          created_at: string
          id: string
          publish_date: string
          puzzle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publish_date: string
          puzzle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publish_date?: string
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_ag_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "ag_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_chain_puzzles: {
        Row: {
          created_at: string
          id: string
          publish_date: string
          puzzle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publish_date: string
          puzzle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publish_date?: string
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_chain_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "chain_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_items: {
        Row: {
          created_at: string
          draft_id: string
          hidden_metadata: Json
          id: string
          is_available: boolean
          name: string
          normalized_name: string
          source: Database["public"]["Enums"]["item_source"]
        }
        Insert: {
          created_at?: string
          draft_id: string
          hidden_metadata?: Json
          id?: string
          is_available?: boolean
          name: string
          normalized_name: string
          source: Database["public"]["Enums"]["item_source"]
        }
        Update: {
          created_at?: string
          draft_id?: string
          hidden_metadata?: Json
          id?: string
          is_available?: boolean
          name?: string
          normalized_name?: string
          source?: Database["public"]["Enums"]["item_source"]
        }
        Relationships: [
          {
            foreignKeyName: "draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_players: {
        Row: {
          display_name: string
          draft_id: string
          guest_id: string
          id: string
          is_ready: boolean
          joined_at: string
          removed_at: string | null
          seat: number
        }
        Insert: {
          display_name: string
          draft_id: string
          guest_id: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          removed_at?: string | null
          seat: number
        }
        Update: {
          display_name?: string
          draft_id?: string
          guest_id?: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          removed_at?: string | null
          seat?: number
        }
        Relationships: [
          {
            foreignKeyName: "draft_players_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_players_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_players_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          ai_personality: Database["public"]["Enums"]["ai_personality"]
          completed_at: string | null
          created_at: string
          current_pick_index: number
          custom_judge_prompt: string | null
          draft_type: Database["public"]["Enums"]["draft_type"]
          host_guest_id: string
          id: string
          judging_mode: Database["public"]["Enums"]["judging_mode"]
          judging_started_at: string | null
          max_players: number
          pending_pick_id: string | null
          phase: Database["public"]["Enums"]["draft_phase"]
          pick_order: Json
          picking_mode: Database["public"]["Enums"]["picking_mode"]
          room_code: string
          rounds: number
          rubric: Json
          timer_seconds: number | null
          topic: string
          turn_deadline: string | null
          veto_suspended_pick_index: number | null
        }
        Insert: {
          ai_personality: Database["public"]["Enums"]["ai_personality"]
          completed_at?: string | null
          created_at?: string
          current_pick_index?: number
          custom_judge_prompt?: string | null
          draft_type: Database["public"]["Enums"]["draft_type"]
          host_guest_id: string
          id?: string
          judging_mode: Database["public"]["Enums"]["judging_mode"]
          judging_started_at?: string | null
          max_players: number
          pending_pick_id?: string | null
          phase?: Database["public"]["Enums"]["draft_phase"]
          pick_order?: Json
          picking_mode?: Database["public"]["Enums"]["picking_mode"]
          room_code: string
          rounds: number
          rubric?: Json
          timer_seconds?: number | null
          topic: string
          turn_deadline?: string | null
          veto_suspended_pick_index?: number | null
        }
        Update: {
          ai_personality?: Database["public"]["Enums"]["ai_personality"]
          completed_at?: string | null
          created_at?: string
          current_pick_index?: number
          custom_judge_prompt?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"]
          host_guest_id?: string
          id?: string
          judging_mode?: Database["public"]["Enums"]["judging_mode"]
          judging_started_at?: string | null
          max_players?: number
          pending_pick_id?: string | null
          phase?: Database["public"]["Enums"]["draft_phase"]
          pick_order?: Json
          picking_mode?: Database["public"]["Enums"]["picking_mode"]
          room_code?: string
          rounds?: number
          rubric?: Json
          timer_seconds?: number | null
          topic?: string
          turn_deadline?: string | null
          veto_suspended_pick_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_host_guest_id_fkey"
            columns: ["host_guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_pending_pick_id_fkey"
            columns: ["pending_pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_pending_pick_id_fkey"
            columns: ["pending_pick_id"]
            isOneToOne: false
            referencedRelation: "safe_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judgments: {
        Row: {
          awards: Json
          created_at: string
          draft_id: string
          explanation: string
          id: string
          idempotency_key: string
          model: string | null
          player_scores: Json
          prompt_version: string
          ranking: Json
          source: Database["public"]["Enums"]["judgment_source"]
          winner_player_ids: Json
        }
        Insert: {
          awards?: Json
          created_at?: string
          draft_id: string
          explanation: string
          id?: string
          idempotency_key: string
          model?: string | null
          player_scores: Json
          prompt_version: string
          ranking: Json
          source: Database["public"]["Enums"]["judgment_source"]
          winner_player_ids: Json
        }
        Update: {
          awards?: Json
          created_at?: string
          draft_id?: string
          explanation?: string
          id?: string
          idempotency_key?: string
          model?: string | null
          player_scores?: Json
          prompt_version?: string
          ranking?: Json
          source?: Database["public"]["Enums"]["judgment_source"]
          winner_player_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "judgments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judgments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_veto_votes: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          pick_id: string
          voter_player_id: string
          wants_veto: boolean
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          pick_id: string
          voter_player_id: string
          wants_veto: boolean
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          pick_id?: string
          voter_player_id?: string
          wants_veto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pick_veto_votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "safe_picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          created_at: string
          draft_id: string
          forfeited: boolean
          id: string
          is_auto_pick: boolean
          item_id: string | null
          item_name: string | null
          overall_pick: number
          pick_in_round: number
          player_id: string
          round: number
          veto_challenge_resolved: boolean
        }
        Insert: {
          created_at?: string
          draft_id: string
          forfeited?: boolean
          id?: string
          is_auto_pick?: boolean
          item_id?: string | null
          item_name?: string | null
          overall_pick: number
          pick_in_round: number
          player_id: string
          round: number
          veto_challenge_resolved?: boolean
        }
        Update: {
          created_at?: string
          draft_id?: string
          forfeited?: boolean
          id?: string
          is_auto_pick?: boolean
          item_id?: string | null
          item_name?: string | null
          overall_pick?: number
          pick_in_round?: number
          player_id?: string
          round?: number
          veto_challenge_resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_suggestions: {
        Row: {
          action: Database["public"]["Enums"]["suggestion_action"]
          decided_at: string | null
          draft_id: string
          id: string
          player_id: string
          status: Database["public"]["Enums"]["suggestion_status"]
          suggested_name: string | null
          target_item_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["suggestion_action"]
          decided_at?: string | null
          draft_id: string
          id?: string
          player_id: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_name?: string | null
          target_item_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["suggestion_action"]
          decided_at?: string | null
          draft_id?: string
          id?: string
          player_id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_name?: string | null
          target_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_suggestions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          player_id: string
          text: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          player_id: string
          text: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          player_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          selected_player_id: string
          voter_player_id: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          selected_player_id: string
          voter_player_id: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          selected_player_id?: string
          voter_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_selected_player_id_fkey"
            columns: ["selected_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_selected_player_id_fkey"
            columns: ["selected_player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      safe_arguments: {
        Row: {
          defense_text: string | null
          draft_id: string | null
          id: string | null
          player_id: string | null
          skipped: boolean | null
          submitted_at: string | null
        }
        Insert: {
          defense_text?: string | null
          draft_id?: string | null
          id?: string | null
          player_id?: string | null
          skipped?: boolean | null
          submitted_at?: string | null
        }
        Update: {
          defense_text?: string | null
          draft_id?: string | null
          id?: string | null
          player_id?: string | null
          skipped?: boolean | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arguments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_commentary: {
        Row: {
          created_at: string | null
          draft_id: string | null
          id: string | null
          model: string | null
          personality: Database["public"]["Enums"]["ai_personality"] | null
          pick_id: string | null
          prompt_version: string | null
          text: string | null
          trigger_tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          model?: string | null
          personality?: Database["public"]["Enums"]["ai_personality"] | null
          pick_id?: string | null
          prompt_version?: string | null
          text?: string | null
          trigger_tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          model?: string | null
          personality?: Database["public"]["Enums"]["ai_personality"] | null
          pick_id?: string | null
          prompt_version?: string | null
          text?: string | null
          trigger_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "commentary_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentary_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "safe_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_draft_items: {
        Row: {
          created_at: string | null
          draft_id: string | null
          id: string | null
          is_available: boolean | null
          name: string | null
          source: Database["public"]["Enums"]["item_source"] | null
        }
        Insert: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          source?: Database["public"]["Enums"]["item_source"] | null
        }
        Update: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          source?: Database["public"]["Enums"]["item_source"] | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_draft_players: {
        Row: {
          display_name: string | null
          draft_id: string | null
          id: string | null
          is_ready: boolean | null
          joined_at: string | null
          removed_at: string | null
          seat: number | null
        }
        Insert: {
          display_name?: string | null
          draft_id?: string | null
          id?: string | null
          is_ready?: boolean | null
          joined_at?: string | null
          removed_at?: string | null
          seat?: number | null
        }
        Update: {
          display_name?: string | null
          draft_id?: string | null
          id?: string | null
          is_ready?: boolean | null
          joined_at?: string | null
          removed_at?: string | null
          seat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_players_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_players_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_drafts: {
        Row: {
          ai_personality: Database["public"]["Enums"]["ai_personality"] | null
          completed_at: string | null
          created_at: string | null
          current_pick_index: number | null
          custom_judge_prompt: string | null
          draft_type: Database["public"]["Enums"]["draft_type"] | null
          id: string | null
          judging_mode: Database["public"]["Enums"]["judging_mode"] | null
          judging_started_at: string | null
          max_players: number | null
          pending_pick_id: string | null
          phase: Database["public"]["Enums"]["draft_phase"] | null
          pick_order: Json | null
          picking_mode: Database["public"]["Enums"]["picking_mode"] | null
          room_code: string | null
          rounds: number | null
          timer_seconds: number | null
          topic: string | null
          turn_deadline: string | null
        }
        Insert: {
          ai_personality?: Database["public"]["Enums"]["ai_personality"] | null
          completed_at?: string | null
          created_at?: string | null
          current_pick_index?: number | null
          custom_judge_prompt?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"] | null
          id?: string | null
          judging_mode?: Database["public"]["Enums"]["judging_mode"] | null
          judging_started_at?: string | null
          max_players?: number | null
          pending_pick_id?: string | null
          phase?: Database["public"]["Enums"]["draft_phase"] | null
          pick_order?: Json | null
          picking_mode?: Database["public"]["Enums"]["picking_mode"] | null
          room_code?: string | null
          rounds?: number | null
          timer_seconds?: number | null
          topic?: string | null
          turn_deadline?: string | null
        }
        Update: {
          ai_personality?: Database["public"]["Enums"]["ai_personality"] | null
          completed_at?: string | null
          created_at?: string | null
          current_pick_index?: number | null
          custom_judge_prompt?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"] | null
          id?: string | null
          judging_mode?: Database["public"]["Enums"]["judging_mode"] | null
          judging_started_at?: string | null
          max_players?: number | null
          pending_pick_id?: string | null
          phase?: Database["public"]["Enums"]["draft_phase"] | null
          pick_order?: Json | null
          picking_mode?: Database["public"]["Enums"]["picking_mode"] | null
          room_code?: string | null
          rounds?: number | null
          timer_seconds?: number | null
          topic?: string | null
          turn_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_pending_pick_id_fkey"
            columns: ["pending_pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_pending_pick_id_fkey"
            columns: ["pending_pick_id"]
            isOneToOne: false
            referencedRelation: "safe_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_judgments: {
        Row: {
          awards: Json | null
          created_at: string | null
          draft_id: string | null
          explanation: string | null
          id: string | null
          model: string | null
          player_scores: Json | null
          prompt_version: string | null
          ranking: Json | null
          source: Database["public"]["Enums"]["judgment_source"] | null
          winner_player_ids: Json | null
        }
        Insert: {
          awards?: Json | null
          created_at?: string | null
          draft_id?: string | null
          explanation?: string | null
          id?: string | null
          model?: string | null
          player_scores?: Json | null
          prompt_version?: string | null
          ranking?: Json | null
          source?: Database["public"]["Enums"]["judgment_source"] | null
          winner_player_ids?: Json | null
        }
        Update: {
          awards?: Json | null
          created_at?: string | null
          draft_id?: string | null
          explanation?: string | null
          id?: string | null
          model?: string | null
          player_scores?: Json | null
          prompt_version?: string | null
          ranking?: Json | null
          source?: Database["public"]["Enums"]["judgment_source"] | null
          winner_player_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "judgments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judgments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_picks: {
        Row: {
          created_at: string | null
          draft_id: string | null
          forfeited: boolean | null
          id: string | null
          is_auto_pick: boolean | null
          item_id: string | null
          item_name: string | null
          overall_pick: number | null
          pick_in_round: number | null
          player_id: string | null
          round: number | null
          veto_challenge_resolved: boolean | null
        }
        Insert: {
          created_at?: string | null
          draft_id?: string | null
          forfeited?: boolean | null
          id?: string | null
          is_auto_pick?: boolean | null
          item_id?: string | null
          item_name?: string | null
          overall_pick?: number | null
          pick_in_round?: number | null
          player_id?: string | null
          round?: number | null
          veto_challenge_resolved?: boolean | null
        }
        Update: {
          created_at?: string | null
          draft_id?: string | null
          forfeited?: boolean | null
          id?: string | null
          is_auto_pick?: boolean | null
          item_id?: string | null
          item_name?: string | null
          overall_pick?: number | null
          pick_in_round?: number | null
          player_id?: string | null
          round?: number | null
          veto_challenge_resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_pool_suggestions: {
        Row: {
          action: Database["public"]["Enums"]["suggestion_action"] | null
          decided_at: string | null
          draft_id: string | null
          id: string | null
          player_id: string | null
          status: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_name: string | null
          target_item_id: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["suggestion_action"] | null
          decided_at?: string | null
          draft_id?: string | null
          id?: string | null
          player_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_name?: string | null
          target_item_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["suggestion_action"] | null
          decided_at?: string | null
          draft_id?: string | null
          id?: string | null
          player_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_name?: string | null
          target_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_suggestions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "draft_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_suggestions_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_items"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_votes: {
        Row: {
          created_at: string | null
          draft_id: string | null
          id: string | null
          selected_player_id: string | null
          voter_player_id: string | null
        }
        Insert: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          selected_player_id?: string | null
          voter_player_id?: string | null
        }
        Update: {
          created_at?: string | null
          draft_id?: string | null
          id?: string | null
          selected_player_id?: string | null
          voter_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "safe_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_selected_player_id_fkey"
            columns: ["selected_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_selected_player_id_fkey"
            columns: ["selected_player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "safe_draft_players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _advance_draft_after_pick: {
        Args: {
          p_draft_id: string
          p_next_pick_index: number
          p_timer_seconds: number
        }
        Returns: {
          o_confirmed_pick_id: string
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string
        }[]
      }
      _pick_order_index_for_overall_pick: {
        Args: { p_overall_pick: number; p_pick_order: Json }
        Returns: number
      }
      _resolve_veto_voting: {
        Args: { p_draft_id: string }
        Returns: {
          o_confirmed_pick_id: string
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string
          o_vetoed: boolean
        }[]
      }
      advance_phase: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: {
          o_phase: string
        }[]
      }
      auto_pick: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: {
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string
        }[]
      }
      create_draft:
        | {
            Args: {
              p_ai_personality: string
              p_display_name: string
              p_draft_type: string
              p_host_guest_id: string
              p_judging_mode: string
              p_max_players: number
              p_rounds: number
              p_timer_seconds: number
              p_topic: string
            }
            Returns: {
              draft_id: string
              player_id: string
              room_code: string
            }[]
          }
        | {
            Args: {
              p_ai_personality: string
              p_custom_judge_prompt?: string
              p_display_name: string
              p_draft_type: string
              p_host_guest_id: string
              p_judging_mode: string
              p_max_players: number
              p_rounds: number
              p_timer_seconds: number
              p_topic: string
            }
            Returns: {
              draft_id: string
              player_id: string
              room_code: string
            }[]
          }
        | {
            Args: {
              p_ai_personality: string
              p_custom_judge_prompt?: string
              p_display_name: string
              p_draft_type: string
              p_host_guest_id: string
              p_judging_mode: string
              p_max_players: number
              p_picking_mode?: string
              p_rounds: number
              p_timer_seconds: number
              p_topic: string
            }
            Returns: {
              draft_id: string
              player_id: string
              room_code: string
            }[]
          }
      ensure_guest_session: { Args: { p_token_hash: string }; Returns: string }
      get_active_guest_session_id: {
        Args: { p_token_hash: string }
        Returns: string
      }
      get_server_time: { Args: never; Returns: string }
      initiate_veto: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: {
          o_current_pick_index: number
          o_pending_pick_id: string
          o_phase: string
          o_turn_deadline: string
        }[]
      }
      join_draft: {
        Args: { p_display_name: string; p_draft_id: string; p_guest_id: string }
        Returns: {
          draft_id: string
          player_id: string
          seat: number
        }[]
      }
      leave_draft: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: undefined
      }
      link_guest_to_account: {
        Args: { p_token_hash: string; p_user_id: string }
        Returns: undefined
      }
      lock_pool: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: undefined
      }
      maybe_advance_from_defense: {
        Args: { p_draft_id: string }
        Returns: boolean
      }
      maybe_advance_from_voting: {
        Args: { p_draft_id: string }
        Returns: boolean
      }
      maybe_resolve_veto_voting: {
        Args: { p_draft_id: string }
        Returns: undefined
      }
      reset_draft_for_rematch: {
        Args: { p_draft_id: string; p_host_guest_id: string }
        Returns: undefined
      }
      send_room_message: {
        Args: { p_draft_id: string; p_guest_id: string; p_text: string }
        Returns: string
      }
      start_defense: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: undefined
      }
      start_draft: {
        Args: { p_draft_id: string; p_guest_id: string; p_pick_order: Json }
        Returns: undefined
      }
      start_pool_review: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: undefined
      }
      submit_defense: {
        Args: {
          p_defense_text?: string
          p_draft_id: string
          p_guest_id: string
          p_skipped?: boolean
        }
        Returns: undefined
      }
      submit_pick: {
        Args: {
          p_draft_id: string
          p_expected_pick?: number
          p_guest_id: string
          p_item_id?: string
          p_item_name?: string
        }
        Returns: {
          o_current_pick_index: number
          o_pending_pick_id: string
          o_phase: string
          o_turn_deadline: string
        }[]
      }
      submit_veto_vote: {
        Args: { p_draft_id: string; p_guest_id: string; p_wants_veto: boolean }
        Returns: {
          o_confirmed_pick_id: string
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string
          o_vetoed: boolean
        }[]
      }
      submit_vote: {
        Args: {
          p_draft_id: string
          p_guest_id: string
          p_selected_player_id: string
        }
        Returns: undefined
      }
      update_draft_config: {
        Args: {
          p_ai_personality: string
          p_custom_judge_prompt: string
          p_draft_id: string
          p_draft_type: string
          p_host_guest_id: string
          p_judging_mode: string
          p_max_players: number
          p_picking_mode: string
          p_rounds: number
          p_timer_seconds: number
          p_topic: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ai_personality: "analyst" | "hype" | "roast" | "custom"
      draft_phase:
        | "LOBBY"
        | "POOL_REVIEW"
        | "DRAFTING"
        | "VETO_VOTING"
        | "DRAFT_COMPLETE"
        | "DEFENSE"
        | "VOTING"
        | "JUDGING"
        | "COMPLETE"
      draft_type: "standard" | "snake" | "random"
      item_source: "ai" | "manual"
      judging_mode: "ai" | "community" | "hybrid"
      judgment_source: "ai" | "fallback"
      picking_mode: "pool" | "off_the_dome"
      suggestion_action: "add" | "remove"
      suggestion_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_personality: ["analyst", "hype", "roast", "custom"],
      draft_phase: [
        "LOBBY",
        "POOL_REVIEW",
        "DRAFTING",
        "VETO_VOTING",
        "DRAFT_COMPLETE",
        "DEFENSE",
        "VOTING",
        "JUDGING",
        "COMPLETE",
      ],
      draft_type: ["standard", "snake", "random"],
      item_source: ["ai", "manual"],
      judging_mode: ["ai", "community", "hybrid"],
      judgment_source: ["ai", "fallback"],
      picking_mode: ["pool", "off_the_dome"],
      suggestion_action: ["add", "remove"],
      suggestion_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
