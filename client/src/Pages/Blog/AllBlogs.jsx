import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  Loader2,
  Search,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AllBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const scrollRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo =
        direction === "left" ? scrollLeft - 300 : scrollLeft + 300;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const blogsRes = await api.get("/blogs", {
          params: {
            category:
              selectedCategory !== "all" ? selectedCategory : undefined,
            search: "",
          },
        });

        if (blogsRes.data.success) {
          let fetchedBlogs = blogsRes.data.blogs;
          // Apply sorting
          if (sortBy === "popular") {
            fetchedBlogs = fetchedBlogs.sort(
              (a, b) => (b.views || 0) - (a.views || 0),
            );
          } else if (sortBy === "newest") {
            fetchedBlogs = fetchedBlogs.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            );
          } else if (sortBy === "reading-time") {
            fetchedBlogs = fetchedBlogs.sort((a, b) => {
              const lengthA = a.content ? a.content.split(/\s+/).length : 1000;
              const lengthB = b.content ? b.content.split(/\s+/).length : 1000;
              return lengthA - lengthB;
            });
          }
          setBlogs(fetchedBlogs);
        }

        const catRes = await api.get("/categories");
        if (catRes.data.success) {
          setCategories(catRes.data.categories);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory, sortBy]);

  return (
    <div className="bg-[#f6f6f7] dark:bg-[#16161c] text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title Section */}
        <div className="mb-10 mt-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600">
              EduHub
            </span>{" "}
            All Articles
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Showing {blogs.length} expert-curated insights for your growth.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex-1 min-w-0 relative group/scroll">
            {/* Left Arrow */}
            <button
              onClick={() => scroll("left")}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 dark:bg-slate-800/95 p-1.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex md:opacity-0 md:group-hover/scroll:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>

            <div
              ref={scrollRef}
              className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth"
            >
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-md text-white border border-transparent"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat._id
                      ? "bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-md text-white border border-transparent"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => scroll("right")}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 dark:bg-slate-800/95 p-1.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex md:opacity-0 md:group-hover/scroll:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              htmlFor="sort"
            >
              Sort By:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em",
                backgroundRepeat: "no-repeat",
                appearance: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
              }}
              className="min-w-[160px] pl-4 pr-10 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="reading-time">Reading Time</option>
            </select>
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#1a1a2e]" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-[#1a1a2e]/10 text-[#1a1a2e] dark:text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-display">
              No articles found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              We couldn't find any articles matching your search criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {blogs.map((blog) => {
              const readingTime = Math.ceil(
                (blog.content
                  ? blog.content.replace(/<[^>]*>?/gm, "").split(/\s+/).length
                  : 1000) / 200,
              );

              return (
                <article
                  key={blog._id}
                  className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >
                  <Link
                    to={`/blog/${blog.slug || blog._id}`}
                    className="block aspect-video overflow-hidden"
                  >
                    <img
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={
                        blog.thumbnail || "https://via.placeholder.com/400x300"
                      }
                    />
                  </Link>
                  <div className="p-6 flex flex-col grow">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-white text-xs font-bold uppercase tracking-wider rounded">
                        {blog.category?.name || "General"}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {readingTime} min read
                      </span>
                    </div>
                    <Link to={`/blog/${blog.slug || blog._id}`}>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-[#1a1a2e] transition-colors leading-snug line-clamp-2">
                        {blog.title}
                      </h3>
                    </Link>
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4 flex-grow tracking-wide">
                      {blog.excerpt ||
                        (blog.content
                          ? blog.content
                              .replace(/<[^>]*>?/gm, "")
                              .substring(0, 100) + "..."
                          : "Explore this interesting topic...")}
                    </p>
                    <Link
                      to={`/blog/${blog.slug || blog._id}`}
                      className="hidden items-center mt-auto text-sm font-bold text-[#1a1a2e] dark:text-slate-200 group-hover:flex hover:gap-2 transition-all w-fit"
                      style={{ display: "inline-flex" }}
                    >
                      Read Full Article
                      <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AllBlogs;
