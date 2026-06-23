export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
          id: string
          play_date: string
          player_token: string
          score: number
        }
        Insert: {
          correct: number
          created_at?: string
          display_name: string
          id?: string
          play_date: string
          player_token: string
          score: number
        }
        Update: {
          correct?: number
          created_at?: string
          display_name?: string
          id?: string
          play_date?: string
          player_token?: string
          score?: number
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
        }
        Relationships: [
          {
            foreignKeyName: "drafts_host_guest_id_fkey"
            columns: ["host_guest_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
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
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: []
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
            foreignKeyName: "pick_veto_votes_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_veto_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "draft_players"
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
          phase?: Database["public"]["Enums"]["draft_phase"] | null
          pick_order?: Json | null
          picking_mode?: Database["public"]["Enums"]["picking_mode"] | null
          room_code?: string | null
          rounds?: number | null
          timer_seconds?: number | null
          topic?: string | null
          turn_deadline?: string | null
        }
        Relationships: []
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
      create_draft: {
        Args: {
          p_ai_personality: string
          p_custom_judge_prompt?: string | null
          p_display_name: string
          p_draft_type: string
          p_host_guest_id: string
          p_judging_mode: string
          p_max_players: number
          p_picking_mode?: string
          p_rounds: number
          p_timer_seconds: number | null
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
      lock_pool: {
        Args: { p_draft_id: string; p_guest_id: string }
        Returns: undefined
      }
      maybe_advance_from_defense: {
        Args: { p_draft_id: string }
        Returns: boolean
      }
      reset_draft_for_rematch: {
        Args: { p_draft_id: string; p_host_guest_id: string }
        Returns: undefined
      }
      start_draft: {
        Args: { p_draft_id: string; p_guest_id: string; p_pick_order: Json }
        Returns: undefined
      }
      start_defense: {
        Args: { p_draft_id: string; p_guest_id: string }
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
          p_expected_pick: number
          p_guest_id: string
          p_item_id?: string
          p_item_name?: string
        }
        Returns: {
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string
          o_pending_pick_id: string | null
        }[]
      }
      submit_veto_vote: {
        Args: {
          p_draft_id: string
          p_guest_id: string
          p_wants_veto: boolean
        }
        Returns: {
          o_confirmed_pick_id: string | null
          o_current_pick_index: number
          o_phase: string
          o_turn_deadline: string | null
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
          p_custom_judge_prompt: string | null
          p_draft_id: string
          p_draft_type: string
          p_host_guest_id: string
          p_judging_mode: string
          p_max_players: number
          p_picking_mode: string
          p_rounds: number
          p_timer_seconds: number | null
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
  graphql_public: {
    Enums: {},
  },
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
      suggestion_action: ["add", "remove"],
      suggestion_status: ["pending", "accepted", "rejected"],
    },
  },
} as const

