import React from "react";
import {
  Search,
  Monitor,
  Users,
  Star,
  CheckCircle,
  Bell,
  ArrowRight,
  Calendar,
} from "lucide-react";
import EventCard from "../components/ui/EventCard";
import {featuredEvents, upcomingEvents} from "../data/mockData";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* 1. NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-blue-900/10 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
              <span className="font-extrabold text-xl text-blue-700 tracking-tight">
                EMS
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
              <a
                href="#"
                className="text-blue-700 border-b-2 border-blue-700 py-5"
              >
                Home
              </a>
              <a href="#" className="text-slate-600 hover:text-blue-700">
                Events
              </a>
              <a href="#" className="text-slate-600 hover:text-blue-700">
                My Calendar
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
              <Bell size={18} />
            </button>
            <button className="font-semibold text-blue-700 text-sm px-4 py-2 hover:bg-blue-50 rounded-xl">
              Log In
            </button>
            <button className="font-semibold text-white bg-blue-700 px-5 py-2 rounded-xl shadow-sm hover:bg-blue-800">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 flex items-center justify-center min-h-[600px]">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Students"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F1B3D]/95 via-blue-900/80 to-[#0F1B3D]/60"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-[2px] bg-blue-400"></div>
            <span className="text-blue-200 font-bold text-xs tracking-widest uppercase">
              University Event Management System
            </span>
            <div className="w-8 h-[2px] bg-blue-400"></div>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Discover & Join <br />
            <span className="text-blue-300">Exciting University</span> Events
          </h1>
          <p className="text-lg text-blue-100/80 mb-10 max-w-2xl mx-auto">
            From hackathons to music festivals — find events that matter to you,
            register in seconds, and make the most of campus life.
          </p>

          {/* Search Box */}
          <div className="bg-white p-2 rounded-2xl flex items-center shadow-xl max-w-2xl mx-auto">
            <div className="pl-4 text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Search events, topics, organizers..."
              className="w-full px-4 py-3 outline-none font-medium text-slate-700 placeholder-slate-400 bg-transparent"
            />
            <button className="bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-800 transition-colors whitespace-nowrap">
              Browse Events <ArrowRight size={18} />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {["Hackathon", "Music", "Free Events", "This Week"].map((tag) => (
              <span
                key={tag}
                className="px-4 py-1.5 rounded-full border border-white/20 text-white/80 text-xs font-semibold backdrop-blur-md cursor-pointer hover:bg-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. STATS BANNER */}
      <section className="bg-blue-700 py-8 border-y border-blue-600">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-blue-500/30">
          <div className="flex items-center gap-4 pl-4">
            <div className="p-3 bg-white/10 rounded-xl text-white">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">48</div>
              <div className="text-xs font-semibold text-blue-200">
                Events This Month
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="p-3 bg-white/10 rounded-xl text-white">
              <Users size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">3,200+</div>
              <div className="text-xs font-semibold text-blue-200">
                Registered Students
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="p-3 bg-white/10 rounded-xl text-white">
              <Star size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">4.8/5</div>
              <div className="text-xs font-semibold text-blue-200">
                Avg. Satisfaction
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="p-3 bg-white/10 rounded-xl text-white">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">120+</div>
              <div className="text-xs font-semibold text-blue-200">
                Events Completed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORY FILTER */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#0F1B3D]">
            Browse by Category
          </h2>
          <a
            href="#"
            className="text-blue-700 font-semibold text-sm flex items-center gap-1 hover:underline"
          >
            All categories <ArrowRight size={16} />
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer hover:shadow-sm">
            <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm">
              <Monitor size={20} />
            </div>
            <span className="font-bold text-blue-700 text-sm">Technology</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl cursor-pointer hover:shadow-sm">
            <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
              <Users size={20} />
            </div>
            <span className="font-bold text-emerald-700 text-sm">
              Conference
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 rounded-2xl cursor-pointer hover:shadow-sm">
            <div className="p-2 bg-white rounded-xl text-purple-600 shadow-sm">
              <Star size={20} />
            </div>
            <span className="font-bold text-purple-700 text-sm">Music</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl cursor-pointer hover:shadow-sm">
            <div className="p-2 bg-white rounded-xl text-orange-600 shadow-sm">
              <CheckCircle size={20} />
            </div>
            <span className="font-bold text-orange-700 text-sm">Sports</span>
          </div>
        </div>
      </section>

      {/* 5. FEATURED EVENTS */}
      <section className="pb-20 max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#0F1B3D]">
              Featured Events
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Handpicked highlights this season
            </p>
          </div>
          <a
            href="#"
            className="text-blue-700 font-semibold text-sm flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight size={16} />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* 6. UPCOMING EVENTS */}
      <section className="py-20 bg-blue-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0F1B3D]">
                Upcoming Events
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Don't miss what's coming next
              </p>
            </div>
            <a
              href="#"
              className="text-blue-700 font-semibold text-sm flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight size={16} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA SECTION */}
      <section className="bg-[#0F1B3D] py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 blur-[100px] rounded-full"></div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to make your mark?
          </h2>
          <p className="text-lg text-slate-300 mb-10">
            Create your free account and start exploring hundreds of university
            events today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors">
              Get Started — It's Free
            </button>
            <button className="bg-transparent border border-white/30 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
              Explore Events
            </button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0B142E] py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl text-white tracking-tight">
              EMS
            </span>
          </div>
          <p className="text-slate-500 text-xs">
            © 2026 University Event Management System. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-white">
              Privacy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
