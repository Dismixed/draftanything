"use client";

import { useState } from "react";
import { CreateRoomForm } from "@/components/lobby/create-room-form";
import { JoinRoomForm } from "@/components/lobby/join-room-form";

type ActiveTab = "create" | "join";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Draft Anything</h1>
          <p className="text-gray-500 mt-2">
            Create a private room and draft any topic with friends.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div
            role="tablist"
            aria-label="Room options"
            className="grid grid-cols-2 border-b"
          >
            <button
              role="tab"
              id="tab-create"
              aria-selected={activeTab === "create"}
              aria-controls="panel-create"
              onClick={() => setActiveTab("create")}
              className={[
                "py-3 text-sm font-semibold transition-colors",
                activeTab === "create"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              Create room
            </button>
            <button
              role="tab"
              id="tab-join"
              aria-selected={activeTab === "join"}
              aria-controls="panel-join"
              onClick={() => setActiveTab("join")}
              className={[
                "py-3 text-sm font-semibold transition-colors",
                activeTab === "join"
                  ? "bg-green-50 text-green-700 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              Join room
            </button>
          </div>

          <div className="p-6">
            {/* Create panel */}
            <div
              id="panel-create"
              role="tabpanel"
              aria-labelledby="tab-create"
              hidden={activeTab !== "create"}
            >
              <CreateRoomForm />
            </div>

            {/* Join panel */}
            <div
              id="panel-join"
              role="tabpanel"
              aria-labelledby="tab-join"
              hidden={activeTab !== "join"}
            >
              <JoinRoomForm />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          No account needed — just pick a name and go.
        </p>
      </div>
    </main>
  );
}
