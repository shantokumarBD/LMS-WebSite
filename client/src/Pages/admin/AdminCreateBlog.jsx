import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  Save,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import JoditEditor from "jodit-react";
import toast from "react-hot-toast";
import { getCategories } from "@/services/categoryApi";

const AdminCreateBlog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
    status: "draft",
    isFeatured: false,
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        if (categoriesData) {
          setCategories(categoriesData);
        }
      } catch (error) {
        toast.error(error.message || "Failed to fetch categories");
      }
    };
    fetchCategories();

    if (isEdit) {
      const fetchBlog = async () => {
        try {
          const response = await api.get(`/blogs/${id}`);
          if (response.data.success) {
            const blog = response.data.blog;
            setFormData({
              title: blog.title,
              content: blog.content,
              excerpt: blog.excerpt || "",
              category: blog.category?._id || blog.category || "",
              tags: blog.tags?.join(",") || "",
              status: blog.status,
              isFeatured: blog.isFeatured,
            });
            setPreview(blog.thumbnail);
          }
        } catch (error) {
          toast.error("Failed to fetch blog details");
        }
      };
      fetchBlog();
    }
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (thumbnail) data.append("thumbnail", thumbnail);

    try {
      setLoading(true);
      const url = isEdit ? `/blogs/${id}` : "/blogs";

      const response = await api({
        method: isEdit ? "PUT" : "POST",
        url,
        data,
      });

      if (response.data.success) {
        toast.success(
          isEdit ? "Blog updated successfully" : "Blog created successfully",
        );
        navigate("/admin/blogs");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save blog");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/blogs")}
          className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">
            {isEdit ? "Edit Article" : "Create New Article"}
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Compose a beautiful article for your community
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Main Content Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#1e293b]/20 border border-gray-800 rounded-[32px] p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                Article Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. The Future of AI in Education"
                className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-lg font-bold placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                Content Editor
              </label>
              <div className="rounded-2xl overflow-hidden border border-gray-800">
                <JoditEditor
                  value={formData.content}
                  onBlur={(newContent) =>
                    setFormData((prev) => ({ ...prev, content: newContent }))
                  }
                  config={{
                    theme: "dark",
                    readonly: false,
                    placeholder: "Start writing your article...",
                    height: 500,
                    askBeforePasteHTML: false,
                    askBeforePasteFromWord: false,
                    defaultActionOnPaste: "insert_clear_html",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                Excerpt (Optional)
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                rows={3}
                placeholder="A short summary for search results and cards..."
                className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-medium resize-none placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#1e293b]/20 border border-gray-800 rounded-[32px] p-8 space-y-8">
            {/* Publish Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Publish Settings
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 appearance-none font-bold"
                >
                  <option value="draft" className="bg-[#1e293b] text-white">
                    Draft Mode
                  </option>
                  <option value="published" className="bg-[#1e293b] text-white">
                    Publish Now
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 appearance-none font-bold"
                >
                  <option value="" className="bg-[#1e293b] text-white">
                    Select Category
                  </option>
                  {categories.map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="bg-[#1e293b] text-white"
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-800/30 rounded-xl transition-all">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded-md border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600/30 ring-offset-gray-900"
                />
                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                  Mark as Featured
                </span>
              </label>
            </div>

            {/* Thumbnail */}
            <div className="space-y-4 pt-6 border-t border-gray-800/50">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
                Cover Thumbnail
              </label>
              <div className="relative group rounded-2xl overflow-hidden border-2 border-dashed border-gray-800 hover:border-blue-600/50 transition-all cursor-pointer aspect-video bg-[#1e293b]/30">
                {preview ? (
                  <>
                    <img
                      src={preview}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnail(null);
                          setPreview(null);
                        }}
                        className="p-3 bg-red-600 rounded-full text-white shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <div className="bg-blue-600/10 p-3 rounded-full text-blue-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-bold text-gray-500 group-hover:text-blue-500">
                      Upload Image
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2 pt-6 border-t border-gray-800/50">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="tech, ai, tutorial"
                className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-bold placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isEdit ? "Update Article" : "Publish Article"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateBlog;
