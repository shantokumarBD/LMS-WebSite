import React, { useEffect, useState } from "react";
import { Users, BookOpen, GraduationCap, Award, Loader2 } from "lucide-react";
import CountUp from "react-countup";
import api from "@/lib/api";

const StatsSection = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/stats");
        if (data.success) {
          setStatsData(data.stats);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      label: "Active Students",
      value: statsData?.totalStudents || 0,
      icon: <Users className="w-6 h-6" />,
      color: "bg-blue-500",
      suffix: "+",
    },
    {
      label: "Total Courses",
      value: statsData?.totalCourses || 0,
      icon: <BookOpen className="w-6 h-6" />,
      color: "bg-indigo-500",
      suffix: "+",
    },
    {
      label: "Certified Tutors",
      value: statsData?.totalInstructors || 0,
      icon: <GraduationCap className="w-6 h-6" />,
      color: "bg-purple-500",
      suffix: "+",
    },
    {
      label: "Success Rate",
      value: statsData?.successRate || 99,
      icon: <Award className="w-6 h-6" />,
      color: "bg-pink-500",
      suffix: "%",
    },
  ];

  if (loading) {
    return (
      <div className="py-20 bg-white dark:bg-slate-900 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group p-8 rounded-4xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center"
            >
              <div
                className={`mb-6 p-4 rounded-2xl ${stat.color} text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500`}
              >
                {stat.icon}
              </div>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                <CountUp end={stat.value} duration={2} />
                {stat.suffix}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
