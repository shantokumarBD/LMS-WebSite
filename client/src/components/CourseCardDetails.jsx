import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Loader2,
  Star,
  PlayCircle,
  Lock,
  Clock,
  Globe,
  Users,
  Award,
  ChevronRight,
  Info,
  CheckCircle2,
  ChevronDown,
  Share2,
  Heart,
  Gift,
  FileText,
  Smartphone,
  Tv,
  Trash2,
  Send,
} from "lucide-react";
import { useCourseDetails } from "@/hooks/useCourseDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  enrollCourseService,
  toggleWishlistService,
  getCourseStatusService,
  createCheckoutSessionService,
  getCourseReviewsService,
  submitReviewService,
  deleteReviewService,
} from "@/services/courseApi";
import { getCourseQuizzesWithStatusService } from "@/services/quizApi";
import { getEnrolledCourses, getCurrentUser } from "@/services/authApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/store/slices/authSlice";
import toast from "react-hot-toast";
import SEO from "@/components/SEO";

// Helper: render star icons for a given rating
const StarRating = ({ rating, size = "h-4 w-4" }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= Math.round(rating)
              ? "text-yellow-500 fill-current"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

const CourseCardDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { siteName } = useSelector((state) => state.settings);
  const [activeTab, setActiveTab] = useState("About");
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(true);
  const [selectedPreviewVideo, setSelectedPreviewVideo] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  // New states for dynamic features
  const [couponInput, setCouponInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftEmail, setGiftEmail] = useState("");
  const [isGifting, setIsGifting] = useState(false);

  const { course, isLoading, isError, error } = useCourseDetails();
  const { data: statusData } = useQuery({
    queryKey: ["courseStatus", id],
    queryFn: () => getCourseStatusService(id),
    enabled: !!user && !!id,
  });

  const isCreator =
    (user?.role === "admin" || user?.role === "teacher") &&
    (user?._id === course?.creator?._id || user?._id === course?.creator);
  const isEnrolled = statusData?.isEnrolled;
  const isWishlisted = statusData?.isWishlisted;

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["courseReviews", id],
    queryFn: () => getCourseReviewsService(id),
    enabled: !!id,
  });

  // Fetch quizzes with attempt status
  const { data: quizzesData } = useQuery({
    queryKey: ["courseQuizzes", id],
    queryFn: () => getCourseQuizzesWithStatusService(id),
    enabled: !!id && !!isEnrolled,
  });

  const averageRating = reviewsData?.averageRating || 0;
  const totalReviews = reviewsData?.totalReviews || 0;
  const reviews = reviewsData?.reviews || [];
  const distribution = reviewsData?.distribution || {};

  // Submit review mutation
  const reviewMutation = useMutation({
    mutationFn: (data) => submitReviewService(id, data),
    onSuccess: () => {
      toast.success("Review submitted!");
      setReviewRating(0);
      setReviewComment("");
      queryClient.invalidateQueries(["courseReviews", id]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit review");
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: () => deleteReviewService(id),
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries(["courseReviews", id]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete");
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (course?.price > 0) {
        const data = await createCheckoutSessionService(id, couponInput);
        if (data.url) {
          window.location.href = data.url; // Redirect to Stripe
        }
        return data;
      } else {
        return enrollCourseService(id);
      }
    },
    onSuccess: async (data) => {
      if (course?.price === 0) {
        toast.success(data.message || "Enrolled successfully!");
        queryClient.invalidateQueries(["courseStatus", id]);

        // Refresh user data in Redux to update enrollment badges globally
        try {
          const userData = await getCurrentUser();
          if (userData.success) {
            dispatch(setUser(userData.user));
          }
        } catch (err) {
          console.error("Failed to refresh user data after enrollment", err);
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Action failed");
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistService(id),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(["courseStatus", id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Action failed");
    },
  });

  const handlePreviewClick = (lecture) => {
    if (lecture.isPreviewFree) {
      setSelectedPreviewVideo(lecture);
      setIsPreviewModalOpen(true);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Course link copied to clipboard!", {
        icon: "🔗",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
    });
  };

  const handleApplyCoupon = () => {
    const codes = {
      WELCOME10: 10,
      EDUBEST20: 20,
      FREE100: 100,
    };

    const discount = codes[couponInput.toUpperCase()];
    if (discount) {
      setAppliedDiscount(discount);
      toast.success(`Coupon Applied! You got ${discount}% off.`, {
        icon: "🎉",
      });
    } else {
      toast.error("Invalid Coupon Code");
      setAppliedDiscount(0);
    }
  };

  const handleSendGift = () => {
    if (!giftEmail || !giftEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsGifting(true);
    // Mocking a backend call
    setTimeout(() => {
      setIsGifting(false);
      setIsGiftModalOpen(false);
      setGiftEmail("");
      toast.success(`Course gifted to ${giftEmail} successfully!`, {
        icon: "🎁",
        duration: 4000,
      });
    }, 1500);
  };

  const groupedLectures = course?.lectures?.reduce((acc, lecture) => {
    const section = lecture.sectionName || "Course Content";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(lecture);
    return acc;
  }, {});

  const completedLectures = statusData?.progress?.completedLectures || [];
  const quizzes = quizzesData?.quizzes || [];

  const getSectionStatus = (sectionName) => {
    if (isCreator) return "unlocked";
    if (!isEnrolled) return "locked";

    const sectionNames = Object.keys(groupedLectures);
    const currentIndex = sectionNames.indexOf(sectionName);

    if (currentIndex === 0) return "unlocked";

    // Regular section locking: must complete ALL lectures and pass ALL quizzes of the PREVIOUS section
    const previousSectionName = sectionNames[currentIndex - 1];
    const prevSectionLectures = groupedLectures[previousSectionName];
    const prevSectionQuizzes = quizzes.filter(
      (q) => q.sectionName === previousSectionName,
    );

    const allLecturesDone = prevSectionLectures.every((l) =>
      completedLectures.includes(l._id),
    );
    const allQuizzesPassed = prevSectionQuizzes.every(
      (q) => q.latestAttempt?.isPassed,
    );

    return allLecturesDone && allQuizzesPassed ? "unlocked" : "locked";
  };

  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // Initialize all sections to open by default
  React.useEffect(() => {
    if (groupedLectures) {
      const initialOpen = {};
      Object.keys(groupedLectures).forEach((section) => {
        initialOpen[section] = true;
      });
      setOpenSections(initialOpen);
    }
  }, [course]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-white mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Loading course details...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center max-w-md">
          <Info className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-red-600 mb-6">
            {error?.message || "Could not fetch course details."}
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const tabs = ["About", "Curriculum", "Instructor", "Reviews"];

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.courseTitle,
    "description": course.subTitle || course.description?.substring(0, 160),
    "provider": {
      "@type": "Organization",
      "name": siteName,
      "sameAs": window.location.origin
    },
    "image": [course.courseThumbnail],
    "offers": [
      {
        "@type": "Offer",
        "category": "Paid",
        "price": course.price,
        "priceCurrency": "BDT"
      }
    ],
    "aggregateRating": totalReviews > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": averageRating,
      "reviewCount": totalReviews
    } : undefined
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pt-20 transition-colors duration-300">
      <SEO 
        title={course.courseTitle} 
        description={course.subTitle || course.description?.substring(0, 160)}
        image={course.courseThumbnail}
        schema={courseSchema}
      />
      {/* 1. BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <span
            onClick={() => navigate("/")}
            className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors"
          >
            Home
          </span>
          <ChevronRight className="h-4 w-4" />
          <span
            onClick={() => navigate("/courses")}
            className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors"
          >
            Courses
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-semibold truncate">
            {course.courseTitle}
          </span>
        </div>
      </div>

      {/* 2. MAIN GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 pb-20">
        {/* LEFT SECTION: Info & Content */}
        <div className="lg:col-span-8 space-y-10">
          {/* Hero Content */}
          <div className="space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 group">
              <img
                src={course.courseThumbnail}
                alt={course.courseTitle}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 p-4 rounded-full shadow-lg">
                  <PlayCircle className="h-12 w-12 text-blue-600 dark:text-white transition-colors" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Badge
                className={`${isEnrolled ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-600"} text-white rounded-md px-3 py-1 font-bold uppercase tracking-wider text-[10px]`}
              >
                {isEnrolled ? "ENROLLED" : "BEST SELLER"}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                {course.courseTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={averageRating} />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {averageRating}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">
                    {course.enrolledStudents?.length || 0} Students
                  </span>
                </div>
                {course.language && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">{course.language}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800 sticky top-20 bg-white dark:bg-gray-900 z-20 pt-2 transition-colors duration-300">
            <div className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold transition-all relative ${
                    activeTab === tab
                      ? "text-blue-600 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.3)]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-8">
            {activeTab === "About" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gray-50/50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-100/50 dark:border-gray-700/50">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">
                    About this course
                  </h2>
                  <div
                    className="prose prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed description-content mb-10"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />

                  {/* Preview Video */}
                  {course.previewVideo && (
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-blue-500 dark:text-white" /> Course
                        Preview
                      </h3>
                      <a
                        href={course.previewVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors px-6 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 font-bold text-blue-700 dark:text-white text-sm group"
                      >
                        <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        Watch Free Preview
                      </a>
                    </div>
                  )}

                  {/* What You'll Learn */}
                  {course.whatYouWillLearn?.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
                        What you'll learn
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.whatYouWillLearn
                          .filter(Boolean)
                          .map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:-translate-y-1 transition-transform"
                            >
                              <CheckCircle2 className="h-5 w-5 text-blue-500 dark:text-white shrink-0 mt-0.5" />
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {item}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {course.requirements?.length > 0 && (
                    <div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
                        Requirements / Prerequisites
                      </h3>
                      <ul className="space-y-2">
                        {course.requirements.filter(Boolean).map((req, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-blue-500 dark:text-white font-bold mt-0.5">
                              →
                            </span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Curriculum" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    Course Curriculum
                  </h2>
                  <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
                    1 Section • {course.lectures?.length || 0} Lectures •{" "}
                    {course.lectures?.length * 10 || 0}m total length
                  </span>
                </div>

                <div className="space-y-4">
                  {groupedLectures &&
                    Object.entries(groupedLectures).map(
                      ([sectionName, lectures], sIndex) => (
                        <div
                          key={sectionName}
                          className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md"
                        >
                          <div
                            onClick={() => toggleSection(sectionName)}
                            className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${openSections[sectionName] ? "" : "-rotate-90"}`}
                              />
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                {sectionName}
                              </h3>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase">
                              {lectures.length} Lessons
                            </span>
                          </div>

                          {openSections[sectionName] && (
                            <div className="p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                              {lectures.map((lecture, index) => {
                                const isCompleted = completedLectures.includes(
                                  lecture._id,
                                );
                                const sectionStatus =
                                  getSectionStatus(sectionName);
                                const isLocked =
                                  !lecture.isPreviewFree &&
                                  !isCreator &&
                                  sectionStatus === "locked";

                                return (
                                  <div
                                    key={lecture._id}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-colors group ${
                                      lecture.isPreviewFree ||
                                      (!isLocked && (isEnrolled || isCreator))
                                        ? "hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
                                        : "opacity-80 cursor-not-allowed"
                                    }`}
                                    onClick={() => {
                                      if (isLocked) {
                                        toast.error(
                                          "Please complete previous sections to unlock.",
                                          { icon: "🔒" },
                                        );
                                        return;
                                      }
                                      if (
                                        lecture.isPreviewFree ||
                                        isEnrolled ||
                                        isCreator
                                      ) {
                                        handlePreviewClick(lecture);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-4">
                                      {isLocked ? (
                                        <Lock className="h-4 w-4 text-gray-400" />
                                      ) : isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                      ) : (
                                        <PlayCircle className="h-5 w-5 text-blue-500 dark:text-white group-hover:scale-110 transition-transform" />
                                      )}
                                      <span
                                        className={`text-sm font-bold transition-colors ${
                                          lecture.isPreviewFree || !isLocked
                                            ? "text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-white"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        {index + 1}. {lecture.lectureTitle}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {isCompleted && (
                                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">
                                          Completed
                                        </span>
                                      )}
                                      {(lecture.isPreviewFree ||
                                        isEnrolled ||
                                        isCreator) &&
                                        !isLocked && (
                                          <span className="text-[10px] font-black text-blue-600 dark:text-white uppercase tracking-widest border-b-2 border-blue-600 dark:border-white">
                                            {isEnrolled || isCreator
                                              ? "Play"
                                              : "Preview"}
                                          </span>
                                        )}
                                      <span className="text-xs text-gray-400 font-medium">
                                        {lecture.duration || "10:00"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Quizzes in Curriculum View */}
                              {quizzes
                                .filter((q) => q.sectionName === sectionName)
                                .map((quiz) => {
                                  const isPassed = quiz.latestAttempt?.isPassed;
                                  const sectionStatus =
                                    getSectionStatus(sectionName);
                                  const isLocked =
                                    !isCreator && sectionStatus === "locked";

                                  return (
                                    <div
                                      key={quiz._id}
                                      className={`flex items-center justify-between p-4 rounded-xl transition-colors group ${
                                        !isLocked && (isEnrolled || isCreator)
                                          ? "hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
                                          : "opacity-80 cursor-not-allowed"
                                      }`}
                                      onClick={() => {
                                        if (isLocked) {
                                          toast.error(
                                            "Complete previous lessons to unlock this quiz.",
                                            { icon: "🔒" },
                                          );
                                          return;
                                        }
                                        if (isEnrolled || isCreator) {
                                          navigate(`/course-progress/${id}`);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-4">
                                        {isLocked ? (
                                          <Lock className="h-4 w-4 text-gray-400" />
                                        ) : isPassed ? (
                                          <CheckCircle2 className="h-5 w-5 text-indigo-500 dark:text-white" />
                                        ) : (
                                          <FileText className="h-5 w-5 text-indigo-400 dark:text-white" />
                                        )}
                                        <span
                                          className={`text-sm font-bold transition-colors ${
                                            !isLocked
                                              ? "text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-white"
                                              : "text-gray-400"
                                          }`}
                                        >
                                          Quiz: {quiz.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {isPassed ? (
                                          <span className="text-[9px] font-black text-indigo-600 dark:text-white uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                            Passed
                                          </span>
                                        ) : (
                                          !isLocked && (
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-white uppercase tracking-widest border-b-2 border-indigo-600 dark:border-white">
                                              Start
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                </div>
              </div>
            )}

            {activeTab === "Instructor" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-black text-gray-900">
                  Instructor
                </h2>
                <div className="flex flex-col md:flex-row gap-8 items-start bg-blue-50/30 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100/50 dark:border-blue-900/30">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {(course.creator?.profilePicture || course.creator?.photoUrl) ? (
                        <img
                          src={course.creator.profilePicture || course.creator.photoUrl}
                          alt={course.creator.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 p-1.5 rounded-full shadow-lg">
                      <Award className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      {course.creator?.name || "Instructor"}
                    </h3>
                    <p className="text-blue-600 dark:text-white text-sm font-bold">
                      {course.creator?.bio ||
                        "Expert Educator & Industry Professional"}
                    </p>
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-bold">
                          {averageRating > 0
                            ? `${averageRating} Rating`
                            : "No ratings yet"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-bold">
                          {course.enrolledStudents?.length || 0} Students
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-2xl">
                      {course.creator?.description ||
                        (course.creator ? `${course.creator.name} is a dedicated educator with a passion for sharing knowledge and helping students achieve their goals.` : "Instructor information is currently unavailable.")}
                    </p>
                    {course.creator && (
                      <Button
                        variant="link"
                        className="text-blue-600 dark:text-white font-black p-0 h-auto hover:text-blue-800 transition-colors"
                        onClick={() => {
                          const instructorId = course.creator._id || course.creator.id;
                          if (instructorId) {
                            navigate(`/instructor/${instructorId}`);
                          } else {
                            toast.error("Instructor profile ID missing");
                          }
                        }}
                      >
                        View Full Profile{" "}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Reviews" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">Reviews</h2>
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>

                {/* Rating Summary */}
                {totalReviews > 0 && (
                  <div className="flex flex-col md:flex-row gap-8 items-start bg-yellow-50/30 dark:bg-yellow-900/10 p-8 rounded-3xl border border-yellow-100/50 dark:border-yellow-800/50">
                    <div className="text-center space-y-2">
                      <div className="text-5xl font-black text-gray-900 dark:text-white">
                        {averageRating}
                      </div>
                      <StarRating rating={averageRating} size="h-5 w-5" />
                      <p className="text-sm text-gray-500 font-medium">
                        {totalReviews} ratings
                      </p>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400 w-3">
                            {star}
                          </span>
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                          <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full transition-all"
                              style={{
                                width: `${totalReviews > 0 ? ((distribution[star] || 0) / totalReviews) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 font-medium w-8 text-right">
                            {distribution[star] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Review Form (only for enrolled students) */}
                {isEnrolled && (
                  <div className="bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Write a Review</h3>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-7 w-7 cursor-pointer transition-colors ${
                              star <= (reviewHover || reviewRating)
                                ? "text-yellow-500 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-2 text-sm font-bold text-gray-600">
                          {reviewRating}/5
                        </span>
                      )}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this course..."
                      className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-gray-200 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                      rows={3}
                    />
                    <Button
                      onClick={() => {
                        if (reviewRating === 0) {
                          toast.error("Please select a rating");
                          return;
                        }
                        reviewMutation.mutate({
                          rating: reviewRating,
                          comment: reviewComment,
                        });
                      }}
                      disabled={reviewMutation.isPending || reviewRating === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {reviewMutation.isPending
                        ? "Submitting..."
                        : "Submit Review"}
                    </Button>
                  </div>
                )}

                {/* Review List */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No reviews yet</p>
                      <p className="text-sm">
                        Be the first to review this course!
                      </p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div
                        key={review._id}
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-white shadow">
                              {review.userId?.profilePicture ? (
                                <img
                                  src={review.userId.profilePicture}
                                  alt={review.userId.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="h-5 w-5 text-gray-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {review.userId?.name || "Anonymous"}
                              </p>
                              <div className="flex items-center gap-2">
                                <StarRating
                                  rating={review.rating}
                                  size="h-3.5 w-3.5"
                                />
                                <span className="text-xs text-gray-400">
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {user?.id === review.userId?._id && (
                            <button
                              onClick={() => deleteReviewMutation.mutate()}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Delete your review"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR (Pricing & Sticky) */}
        <div className="lg:col-span-4 lg:relative">
          <div className="lg:sticky lg:top-32 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700 p-8 space-y-8 transition-transform hover:-translate-y-1">
              {/* Price section - only show for non-enrolled users */}
              {!isEnrolled && !isCreator && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                      ৳
                      {appliedDiscount > 0
                        ? Math.round(
                            course.price * (1 - appliedDiscount / 100),
                          )
                        : course.price}
                    </span>
                    {(course.discount > 0 || appliedDiscount > 0) && (
                      <>
                        <span className="text-lg text-gray-400 line-through font-medium">
                          ৳
                          {Math.round(
                            course.price / (1 - course.discount / 100),
                          )}
                        </span>
                        <Badge className="bg-green-100 text-green-700 border-0 font-bold px-2 py-0.5">
                          {course.discount + appliedDiscount}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  {appliedDiscount > 0 && (
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded inline-block">
                      Extra {appliedDiscount}% coupon applied!
                    </p>
                  )}
                </div>
              )}

              {/* Enrolled user greeting */}
              {isEnrolled && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-700 font-black text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      You're enrolled in this course
                    </div>
                    <p className="text-green-600 text-[10px] font-bold uppercase tracking-wider">
                      {Math.round(
                        (completedLectures.length /
                          (course.lectures?.length || 1)) *
                          100,
                      )}
                      % Completed
                    </p>
                  </div>
                  <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-700"
                      style={{
                        width: `${(completedLectures.length / (course.lectures?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 transition-all hover:scale-[1.02]"
                  disabled={enrollMutation.isPending}
                  onClick={() => {
                    if (!user) {
                      navigate("/login", { state: { from: location } });
                      return;
                    }
                    if (isCreator) {
                      navigate(`/admin/course/${id}`);
                    } else if (isEnrolled) {
                      navigate(`/course-progress/${id}`);
                    } else {
                      enrollMutation.mutate();
                    }
                  }}
                >
                  {enrollMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : isCreator ? (
                    "Manage Course"
                  ) : isEnrolled ? (
                    "Continue Learning"
                  ) : (
                    "Enroll Now"
                  )}
                </Button>
                {!isEnrolled && !isCreator && (
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2">
                    30-day money-back guarantee
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h4 className="font-black text-gray-900 dark:text-white text-sm">
                  This course includes:
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      icon: PlayCircle,
                      text: `${course.lectures?.length || 0} hours on-demand video`,
                    },
                    { icon: FileText, text: "15 downloadable resources" },
                    { icon: Globe, text: "Full lifetime access" },
                    { icon: Smartphone, text: "Access on mobile and TV" },
                    { icon: Award, text: "Certificate of completion" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-400"
                    >
                      <item.icon className="h-4 w-4 text-blue-500" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!isEnrolled && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-blue-600 dark:hover:text-white transition-colors uppercase tracking-widest"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button
                    onClick={() => {
                      if (!user) {
                        navigate("/login", { state: { from: location } });
                        return;
                      }
                      wishlistMutation.mutate();
                    }}
                    disabled={wishlistMutation.isPending}
                    className={`flex items-center gap-2 text-xs font-black transition-colors uppercase tracking-widest ${
                      isWishlisted
                        ? "text-red-500"
                        : "text-gray-500 hover:text-red-500"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`}
                    />
                    {isWishlisted ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={() => setIsGiftModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-blue-600 dark:hover:text-white transition-colors uppercase tracking-widest"
                  >
                    <Gift className="h-4 w-4" /> Gift
                  </button>
                </div>
              )}
            </div>

            {!isEnrolled && !isCreator && (
              <div className="flex bg-gray-100/50 dark:bg-gray-700/50 rounded-2xl p-2 border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Enter Coupon Code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="bg-transparent border-0 flex-1 px-4 text-sm font-bold dark:text-white placeholder:text-gray-400 focus:ring-0"
                />
                <Button
                  variant="ghost"
                  onClick={handleApplyCoupon}
                  className="text-blue-600 dark:text-white font-black text-xs hover:bg-white dark:hover:bg-gray-800 rounded-xl shadow-sm transition-all"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 bg-white/5 backdrop-blur-md absolute top-0 left-0 w-full z-10">
            <DialogTitle className="text-white text-lg font-bold truncate pr-8">
              Preview: {selectedPreviewVideo?.lectureTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full flex items-center justify-center bg-zinc-900 pt-14">
            {selectedPreviewVideo?.videoUrl ? (
              (() => {
                const url = selectedPreviewVideo.videoUrl;
                const isYoutube =
                  url.includes("youtube.com") || url.includes("youtu.be");

                if (isYoutube) {
                  // Extract YouTube video ID
                  const videoId =
                    url.split("v=")[1]?.split("&")[0] ||
                    url.split("youtu.be/")[1]?.split("?")[0] ||
                    url.split("/embed/")[1]?.split("?")[0];

                  return (
                    <iframe
                      key={videoId}
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      title={selectedPreviewVideo.lectureTitle}
                    />
                  );
                }

                return (
                  <video
                    key={selectedPreviewVideo._id || url}
                    src={url}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full"
                    controlsList="nodownload"
                    onError={(e) => console.error("Preview Video Error:", e)}
                  />
                );
              })()
            ) : (
              <div className="text-gray-400 flex flex-col items-center gap-3">
                <PlayCircle className="h-16 w-16 opacity-20" />
                <p className="font-medium text-sm">
                  No video uploaded for this lecture yet
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Course Modal */}
      <Dialog open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen}>
        <DialogContent className="max-w-md p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl">
          <DialogHeader>
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Gift className="h-8 w-8 text-blue-600 dark:text-white" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-gray-900 dark:text-white">
              Gift this course
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <p className="text-gray-500 text-center text-sm font-medium">
              Enter the recipient's email address below. They will receive a
              notification to join the course.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                Recipient Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={giftEmail}
                onChange={(e) => setGiftEmail(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
              />
            </div>
            <Button
              onClick={handleSendGift}
              disabled={isGifting || !giftEmail}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              {isGifting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Sending Gift...
                </>
              ) : (
                "Send Gift"
              )}
            </Button>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-tighter">
              A secure enrollment link will be sent to the recipient.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseCardDetails;
