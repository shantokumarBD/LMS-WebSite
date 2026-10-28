import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import BlogCard from "../../components/Blog/BlogCard";
import AdSense from "../../components/Blog/AdSense";
import {
  Search,
  Grid,
  LayoutGrid,
  Code,
  TrendingUp,
  Palette,
  Megaphone,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [featuredBlog, setFeaturedBlog] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const scrollRef = React.useRef(null);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success("Thanks for subscribing to EduHub!");
      setEmail("");
    } else {
      toast.error("Please enter a valid email address.");
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === "left" ? scrollLeft - 300 : scrollLeft + 300;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch blogs
        const blogsRes = await api.get("/blogs", {
          params: {
            category:
              selectedCategory !== "all" ? selectedCategory : undefined,
            search: searchQuery,
          },
        });

        if (blogsRes.data.success) {
          const allBlogs = blogsRes.data.blogs;
          setBlogs(allBlogs.filter((b) => !b.isFeatured));
          const featured = allBlogs.find((b) => b.isFeatured) || allBlogs[0];
          setFeaturedBlog(featured);
        }

        // Fetch categories
        const catRes = await api.get("/categories");
        if (catRes.data.success) {
          setCategories(catRes.data.categories);
        }
      } catch (error) {
        console.error("Error fetching blog data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="bg-[#F4F4F9] dark:bg-slate-950 min-h-screen font-sans pb-20 pt-24 transition-colors duration-300">
      <SEO
        title="The EduHub Blog"
        description="Latest insights, tutorials, and success stories from the EduHub community."
      />
      {/* Hero Search & Filter Section */}
      <section className="px-6 lg:px-20 mb-12 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
        <div className="w-full md:w-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2 font-display">
            The{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600">
              EduHub
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Discover the latest strategies, tutorials, and insights.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-[400px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-3 px-6 pl-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#4ECCA3] focus:ring-1 focus:ring-[#4ECCA3] transition-colors shadow-sm"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </section>

      {/* Categories Horizontal Scroll */}
      <section className="max-w-7xl mx-auto px-6 lg:px-20 mb-12 relative group/scroll">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 md:left-14 top-1/2 -translate-y-1/2 z-10 bg-white/95 dark:bg-slate-800/95 p-2 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex md:opacity-0 md:group-hover/scroll:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-700 dark:text-slate-200" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto pb-2 gap-3 no-scrollbar scroll-smooth"
        >
          <button
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              selectedCategory === "all"
                ? "bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md border-transparent"
                : "bg-white text-slate-500 border border-slate-200 hover:border-purple-500 hover:text-purple-600 shadow-sm"
            }`}
          >
            All Topics
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`shrink-0 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                selectedCategory === cat._id
                  ? "bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md border-transparent"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:text-purple-600 shadow-sm"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 md:right-14 top-1/2 -translate-y-1/2 z-10 bg-white/95 dark:bg-slate-800/95 p-2 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex md:opacity-0 md:group-hover/scroll:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-700 dark:text-slate-200" />
        </button>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-20">
        {/* Dynamic Ad Placement - Top */}
        <AdSense slotId="blog-top-banner" format="horizontal" />

        {/* Featured Insight */}
        {featuredBlog && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[3px] bg-[#4ECCA3] rounded-full"></div>
              <h2 className="text-xl font-bold text-slate-900 tracking-wide font-display">
                Featured Insight
              </h2>
            </div>

            <div className="group relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col lg:flex-row min-h-[400px]">
              {/* Image Side */}
              <div className="relative w-full lg:w-1/2 p-4 lg:p-6 pb-0 lg:pr-0">
                <div className="relative h-64 lg:h-full w-full overflow-hidden rounded-[1.5rem]">
                  <img
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={featuredBlog.thumbnail}
                    alt={featuredBlog.title}
                  />
                  <div className="absolute top-4 left-4 bg-slate-900 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md">
                    {featuredBlog.category?.name || "Strategy"}
                  </div>
                </div>
              </div>

              {/* Content Side */}
              <div className="relative w-full lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>
                      {Math.ceil(
                        (featuredBlog.content
                          ? featuredBlog.content
                              .replace(/<[^>]*>?/gm, "")
                              .split(/\s+/).length
                          : 1000) / 200,
                      )}{" "}
                      min read
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>
                      {new Date(featuredBlog.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </div>
                </div>

                <Link to={`/blog/${featuredBlog.slug || featuredBlog._id}`}>
                  <h3 className="text-3xl lg:text-[2.5rem] font-bold text-slate-900 dark:text-white leading-[1.1] mb-6 hover:text-[#4ECCA3] transition-colors font-display tracking-tight">
                    {featuredBlog.title}
                  </h3>
                </Link>

                <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-3">
                  {featuredBlog.excerpt ||
                    (featuredBlog.content
                      ? featuredBlog.content
                          .replace(/<[^>]*>?/gm, "")
                          .substring(0, 150) + "..."
                      : "")}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-4">
                    <img
                      className="h-10 w-10 rounded-full object-cover border-2 border-slate-100"
                      src={
                        featuredBlog.author?.profilePicture ||
                        "https://github.com/shadcn.png"
                      }
                      alt={featuredBlog.author?.name}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {featuredBlog.author?.name || "Admin"}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Lead Tech Strategist
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/blog/${featuredBlog.slug || featuredBlog._id}`}
                    className="w-10 h-10 rounded-xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center hover:scale-105 transition-all shadow-md"
                  >
                    <ArrowRight className="w-5 h-5 -rotate-45" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Ad Placement - Middle */}
        <AdSense slotId="blog-mid-list" format="auto" />

        {/* Latest Articles Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Latest Articles
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="p-2.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#4ECCA3] hover:text-[#4ECCA3] transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-lg bg-transparent text-slate-400 dark:text-slate-500 border border-transparent hover:text-slate-900 dark:hover:text-white transition-colors">
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Regular Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <BlogCard key={blog._id} blog={blog} />
          ))}
        </div>

        {/* No Blogs Found */}
        {!loading && blogs.length === 0 && !featuredBlog && (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 mt-8 shadow-sm">
            <div className="w-16 h-16 bg-[#4ECCA3]/10 text-[#4ECCA3] rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">
              No articles found
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              We couldn't find any articles matching your search criteria or
              selected category.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="px-6 py-3 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-all"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Load More Button Placeholder */}
        {blogs.length > 0 && (
          <div className="flex justify-center mt-12 mb-20">
            <Link
              to="/blogs"
              className="px-8 py-3.5 rounded-xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-sm font-bold text-white hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              View All Articles
            </Link>
          </div>
        )}

        {/* Subscription Section */}
        <div className="mt-12 rounded-[2.5rem] bg-slate-900 px-8 py-16 text-center text-white relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4ECCA3]/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm mx-auto">
            <Megaphone className="w-6 h-6 text-[#4ECCA3]" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl max-w-lg leading-tight font-display">
            Never miss an update
          </h2>
          <p className="mb-10 max-w-md mx-auto text-slate-400 text-sm">
            Join 50,000+ professionals receiving our weekly digest of the best
            learning resources.
          </p>
          <form
            onSubmit={handleSubscribe}
            className="flex w-full max-w-lg flex-col gap-3 sm:flex-row relative z-10"
          >
            <input
              className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-indigo-500/50 focus:ring-0 outline-none backdrop-blur-sm transition-all"
              placeholder="Enter your email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-4 text-sm font-bold text-white hover:scale-105 transition-all shadow-md whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Dynamic Ad Placement - Bottom */}
        <div className="mt-16">
          <AdSense slotId="blog-bottom-banner" format="horizontal" />
        </div>
      </main>
    </div>
  );
};

export default BlogPage;
