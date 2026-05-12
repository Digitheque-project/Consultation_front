import React from "react";

export function NotificationSkeleton() {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] animate-pulse border border-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div className="h-3 w-24 bg-gray-100 rounded-full" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-gray-100 rounded-full" />
          <div className="w-2 h-2 rounded-full bg-gray-100" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-32 bg-gray-100 rounded-lg" />
            <div className="h-4 w-12 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div>
          <div className="h-2 w-20 bg-gray-50 rounded-full mb-2" />
          <div className="h-4 w-full bg-gray-100 rounded-lg" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-gray-100" />
          <div>
            <div className="h-4 w-36 bg-gray-100 rounded-full mb-1.5" />
            <div className="h-2.5 w-24 bg-gray-50 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-24 bg-gray-100 rounded-[10px]" />
          <div className="h-10 w-24 bg-gray-100 rounded-[10px]" />
          <div className="h-10 w-28 bg-gray-100 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
