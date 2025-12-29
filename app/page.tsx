"use client";
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Inbox from "../components/Inbox";
import AnalysisSummary from "../components/AnalysisSummary";
import OutgoingResponses from "../components/OutgoingResponses";
import GoogleSheetsIntegration from "../components/GoogleSheetsIntegration";

const dummyResponses = [
  { time: "10:30", to: "ali@example.com", subject: "Order Help", status: "Sent" },
  { time: "11:00", to: "bob@example.com", subject: "Product Info", status: "Sent" },
];

const dummySheets = [
  { date: "08-01-24", sender: "Ali", subject: "Test", response: "Hi there!", status: "Sent" },
  { date: "08-01-24", sender: "John", subject: "Test 2", response: "Hello!", status: "Sent" },
];

export default function Dashboard() {
  const [selected, setSelected] = useState("inbox");

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar selected={selected} setSelected={setSelected} />
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {selected === "inbox" && <Inbox />}
        {selected === "analysis" && <AnalysisSummary positive={75} negative={10} neutral={15} />}
        {selected === "sheets" && <GoogleSheetsIntegration entries={dummySheets} />}
        <OutgoingResponses responses={dummyResponses} />
      </div>
    </div>
  );
}
