"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import PageHeader from "@/components/ui/Header";

export default function SettingsPage() {
  const [companyEmail, setCompanyEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [newParam, setNewParam] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const addParam = () => {
    if (newParam.trim() && !params.includes(newParam.trim())) {
      setParams([...params, newParam.trim()]);
      setNewParam("");
    }
  };

  const removeParam = (i: number) => setParams(params.filter((_, idx) => idx !== i));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-auto">

      {/* HEADER */}
      <PageHeader
        title="Settings"
        subtitle="Configure AI Email Assistant"
      />

      {/* SETTINGS PANEL */}
      <div className="border border-border rounded-xl p-4 flex flex-col gap-5">

        {/* Company Email */}
        <div className="flex flex-col gap-1 text-sm">
          <label>Company Email</label>
          <input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            placeholder="example@company.com"
            className="border border-border rounded-md px-3 py-2 outline-none text-sm"
          />
        </div>

        {/* Email Code */}
        <div className="flex flex-col gap-1 text-sm">
          <label>Email Code (16 chars)</label>
          <input
            type="text"
            maxLength={16}
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value)}
            placeholder="Enter 16 character code"
            className="border border-border rounded-md px-3 py-2 outline-none text-sm"
          />
        </div>

        {/* API Display */}
        <div className="flex flex-col gap-1 text-sm">
          <label>Program API</label>
          <input
            type="text"
            value="https://yourprogram.api.example.com"
            readOnly
            className="border border-border rounded-md px-3 py-2 bg-muted/20 text-sm cursor-not-allowed"
          />
        </div>

        {/* Parameters */}
        <div className="flex flex-col gap-1 text-sm">
          <label>Category Parameters</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newParam}
              onChange={(e) => setNewParam(e.target.value)}
              placeholder="Add new parameter"
              className="border border-border rounded-md px-3 py-2 flex-1 outline-none text-sm"
            />
            <button
              onClick={addParam}
              className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary/80"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {params.map((p, i) => (
              <div key={i} className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-xs bg-muted/10">
                {p}
                <X size={12} className="cursor-pointer" onClick={() => removeParam(i)} />
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Description */}
        <div className="flex flex-col gap-1 text-sm">
          <label>Prompt Description</label>
          <textarea
            value={promptDescription}
            onChange={(e) => setPromptDescription(e.target.value)}
            placeholder="Describe everything for the AI prompt"
            className="border border-border rounded-md px-3 py-2 outline-none text-sm resize-none h-24"
          />
          <label className="mt-2">Or upload a file</label>
          <input
            type="file"
            onChange={handleFileUpload}
            className="text-sm"
            accept=".txt,.md,.json"
          />
          {file && <p className="text-xs mt-1 text-muted">Selected file: {file.name}</p>}
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-2">
          <button className="bg-success text-white px-4 py-2 rounded-md hover:bg-success/80 text-sm">
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
}
