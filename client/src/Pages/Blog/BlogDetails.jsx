import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import api from "@/lib/api";
import toast from "react-hot-toast";
import AdSense from "../../components/Blog/AdSense";
import SEO from "../../components/SEO";

// ─────────────────────────────────────────────
// CommentSection component
// ─────────────────────────────────────────────
import CommentSection from "@/components/Blog/CommentSection";

const BlogDetails = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const [blog, setBlog] = useState(null);
  const [popularBlogs, setPopularBlogs] = useState([]);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const fetchBlogData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/blogs/${identifier}`);
        if (response.data.success) {
          const currentBlog = response.data.blog;
          setBlog(currentBlog);

          // Fetch Popular Blogs
          try {
            const popRes = await api.get("/blogs?sortBy=views&limit=4");
            if (popRes.data.success) {
              setPopularBlogs(
                popRes.data.blogs
                  .filter((b) => b._id !== currentBlog._id)
                  .slice(0, 3),
              );
            }
          } catch (e) {
            console.error("Error fetching popular blogs", e);
          }

          // Fetch Related Blogs
          if (currentBlog.category?._id) {
            try {
              const relRes = await api.get(
                `/blogs?category=${currentBlog.category._id}&limit=4`,
              );
              if (relRes.data.success) {
                setRelatedBlogs(
                  relRes.data.blogs
                    .filter((b) => b._id !== currentBlog._id)
                    .slice(0, 3),
                );
              }
            } catch (e) {
              console.error("Error fetching related blogs", e);
            }
          }
        }
      } catch (err) {
        setError("Blog post not found or an error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlogData();
    window.scrollTo(0, 0);
  }, [identifier]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F9]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-[#4ECCA3]/20 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-[#4ECCA3]/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F9] p-6">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">{error}</h2>
        <Link
          to="/blog"
          className="text-indigo-600 font-bold hover:underline flex items-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_back</span> Back to
          EduHub
        </Link>
      </div>
    );
  }

  const wordCount = blog.content
    ? blog.content.replace(/<[^>]*>?/gm, "").split(/\s+/).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const publishDate = new Date(blog.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-[#F4F4F9] dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 font-sans min-h-screen w-full flex-col overflow-x-hidden pt-24 pb-20">
      <SEO
        title={blog.title}
        description={
          blog.summary ||
          blog.content?.substring(0, 160).replace(/<[^>]*>?/gm, "")
        }
        image={blog.banner}
        type="article"
      />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:py-16">
        {/* Back Button */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-600 mb-8 font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>{" "}
          Back to EduHub
        </Link>

        {/* Article Header */}
        <div className="mb-10 text-center max-w-4xl mx-auto">
          <nav className="mb-6 flex justify-center gap-2 text-sm font-medium text-purple-600 uppercase tracking-widest">
            <Link to="/blog" className="hover:text-pink-600 transition-colors">
              {blog.category?.name || "General"}
            </Link>
            {blog.tags && blog.tags.length > 0 && (
              <>
                <span>•</span>
                <Link to="/blog">{blog.tags[0]}</Link>
              </>
            )}
          </nav>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-slate-900 dark:text-white mb-6 font-display">
            {blog.title}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 p-0.5">
              <img
                className="h-full w-full rounded-full object-cover"
                alt={blog.author?.name}
                src={
                  blog.author?.profilePicture || "https://github.com/shadcn.png"
                }
              />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white">
                {blog.author?.name || "Admin"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {publishDate} · {readingTime} min read
              </p>
            </div>
          </div>
        </div>

        {/* Top Banner Ad */}
        <div className="mx-auto mb-12 max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-h-[90px]">
          <AdSense slotId="blog-details-top" format="horizontal" />
        </div>

        {/* Main Layout: Sidebar Share | Content | Sidebar Ads/Posts */}
        <div className="relative flex flex-col lg:flex-row gap-12">
          {/* Social Share Floating Sidebar */}
          <aside className="hidden lg:block w-16 shrink-0">
            <div className="sticky top-32 flex flex-col gap-4 items-center">
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                Share
              </span>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:text-white transition-all shadow-sm"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?url=${window.location.href}&text=${blog.title}`,
                    "_blank",
                  )
                }
              >
                <span className="material-symbols-outlined text-lg">share</span>
              </button>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:text-white transition-all shadow-sm"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`,
                    "_blank",
                  )
                }
              >
                <span className="material-symbols-outlined text-lg">
                  thumb_up
                </span>
              </button>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:text-white transition-all shadow-sm"
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
              >
                <span className="material-symbols-outlined text-lg">link</span>
              </button>
            </div>
          </aside>

          {/* Article Body */}
          <article className="flex-1 max-w-3xl">
            <img
              className="w-full h-auto max-h-[500px] object-cover rounded-2xl mb-10 shadow-2xl"
              alt={blog.title}
              src={blog.thumbnail || "https://via.placeholder.com/800x400"}
            />

            <div
              className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose-headings:font-display prose-headings:text-slate-900! dark:prose-headings:text-white! prose-a:text-[#4ECCA3]! prose-img:rounded-2xl prose-blockquote:border-l-4 prose-blockquote:border-[#4ECCA3] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-500! dark:prose-blockquote:text-slate-400! prose-blockquote:bg-[#4ECCA3]/5! prose-blockquote:py-2 prose-blockquote:rounded-r-lg **:text-inherit! **:bg-transparent! **:font-inherit!"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* In-feed Ad Simulation or Real Ad */}
            <div className="my-10 overflow-hidden rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-h-[250px]">
              <AdSense slotId="blog-details-infeed" format="fluid" />
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-16 flex flex-wrap gap-2">
                {blog.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-200 dark:bg-slate-800 px-4 py-1 text-sm font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* Right Sidebar: Popular Posts & Skyscrapers Ad */}
          <aside className="w-full lg:w-80 flex flex-col gap-10 shrink-0">
            {/* Popular Posts */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white font-display">
                Popular Posts
              </h3>
              <div className="flex flex-col gap-6">
                {popularBlogs.length > 0 ? (
                  popularBlogs.map((popBlog) => (
                    <Link
                      key={popBlog._id}
                      to={`/blog/${popBlog.slug || popBlog._id}`}
                      className="group flex gap-4"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                        <img
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                          alt={popBlog.title}
                          src={
                            popBlog.thumbnail ||
                            "https://via.placeholder.com/150"
                          }
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors line-clamp-2">
                          {popBlog.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.ceil(
                            (popBlog.content
                              ?.replace(/<[^>]*>?/gm, "")
                              .split(/\s+/).length || 1000) / 200,
                          )}{" "}
                          min read
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No popular posts yet.
                  </p>
                )}
              </div>
            </div>

            {/* Vertical Sky-scraper Ad */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Advertisement
              </p>
              <AdSense slotId="blog-sidebar-vertical" format="vertical" />
            </div>
          </aside>
        </div>

        {/* ─────────── COMMENTS SECTION ─────────── */}
        {blog && (
          <CommentSection blogId={blog._id} user={user} navigate={navigate} />
        )}

        {/* Related Posts Section */}
        <section className="mt-24 border-t border-slate-200 dark:border-slate-800 pt-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-display">
              Related Posts
            </h2>
            <Link
              className="flex items-center gap-2 text-purple-600 font-bold hover:text-pink-600 transition-colors"
              to="/blog"
            >
              View all articles{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedBlogs.length > 0 ? (
              relatedBlogs.map((relBlog) => (
                <Link
                  key={relBlog._id}
                  to={`/blog/${relBlog.slug || relBlog._id}`}
                  className="group cursor-pointer"
                >
                  <div className="aspect-video overflow-hidden rounded-xl bg-slate-200 mb-4">
                    <img
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      alt={relBlog.title}
                      src={
                        relBlog.thumbnail ||
                        "https://via.placeholder.com/400x250"
                      }
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors mb-2 font-display line-clamp-2">
                    {relBlog.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                    {relBlog.content
                      ? relBlog.content
                          .replace(/<[^>]*>?/gm, "")
                          .substring(0, 100) + "..."
                      : ""}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 col-span-3">
                No related posts found.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogDetails;
