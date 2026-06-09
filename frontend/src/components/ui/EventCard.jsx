import React from "react";
import {Calendar, MapPin, User} from "lucide-react";

const EventCard = ({event}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Image & Badges */}
      <div className="relative h-48 w-full bg-slate-200">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-blue-700">
          {event.category}
        </div>
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${event.price === "Free" ? "bg-green-500" : "bg-slate-900/90"}`}
        >
          {event.price}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-[#0F1B3D] mb-4 line-clamp-2 leading-tight">
          {event.title}
        </h3>

        <div className="space-y-2 mb-6">
          <div className="flex items-center text-slate-500 text-sm gap-2">
            <Calendar size={16} className="text-blue-600" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center text-slate-500 text-sm gap-2">
            <MapPin size={16} className="text-blue-600" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center text-slate-500 text-sm gap-2">
            <User size={16} className="text-blue-600" />
            <span>
              by{" "}
              <span className="font-semibold text-slate-700">
                {event.organizer}
              </span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-auto">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>{event.registered} registered</span>
            <span>{event.total - event.registered} left</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{width: `${(event.registered / event.total) * 100}%`}}
            ></div>
          </div>
          <button className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
