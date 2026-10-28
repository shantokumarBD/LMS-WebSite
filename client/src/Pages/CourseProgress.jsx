import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getCourseById,
  getUserCourseProgressService,
  updateLectureProgressService,
  getCourseReviewsService,
  submitReviewService,
  deleteReviewService,
} from "@/services/courseApi";
import {
  Loader2,
  PlayCircle,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  FileText,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getCourseQuizzesWithStatusService } from "@/services/quizApi";
import QuizPlayer from "@/components/QuizPlayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSelector } from "react-redux";

// Import the extracted components
import CourseSidebar from "@/components/CourseProgress/CourseSidebar";
import QAModal from "@/components/CourseProgress/QAModal";
import CertificateModal from "@/components/CourseProgress/CertificateModal";
import AboutTab from "@/components/CourseProgress/AboutTab";
import CurriculumTab from "@/components/CourseProgress/CurriculumTab";
import InstructorTab from "@/components/CourseProgress/InstructorTab";
import ReviewsTab from "@/components/CourseProgress/ReviewsTab";
import NotesTab from "@/components/CourseProgress/NotesTab";
import ForumTab from "@/components/CourseProgress/ForumTab";
import SEO from "@/components/SEO";

const CourseProgress = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [currentLecture, setCurrentLecture] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);

  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const {
    data: courseData,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useQuery({
    queryKey: ["courseDetails", id],
    queryFn: () => getCourseById(id),
  });

  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ["courseProgress", id],
    queryFn: () => getUserCourseProgressService(id),
  });

  const { data: quizzesData } = useQuery({
    queryKey: ["courseQuizzes", id],
    queryFn: () => getCourseQuizzesWithStatusService(id),
  });

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["courseReviews", id],
    queryFn: () => getCourseReviewsService(id),
    enabled: !!id,
  });

  const queryClient = useQueryClient();

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

  const updateProgressMutation = useMutation({
    mutationFn: (lectureId) => updateLectureProgressService(id, lectureId),
    onSuccess: (data) => {
      queryClient.setQueryData(["courseProgress", id], data);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update progress");
    },
  });

  const course = courseData?.course;
  
  // Use enriched lectures from progress API (has drip logic) if available, otherwise fallback to course data
  const lectures = progressData?.lectures || course?.lectures || [];
  const completedLectures = progressData?.progress?.completedLectures || [];
  const quizzes = quizzesData?.quizzes || [];

  const totalItems = lectures.length + quizzes.length;
  const passedQuizzesCount = quizzes.filter(
    (q) => q.latestAttempt?.isPassed,
  ).length;
  const completedItems = completedLectures.length + passedQuizzesCount;

  const isCourseComplete = totalItems > 0 && completedItems >= totalItems;
  const isCourseCompleted =
    lectures.length > 0 &&
    completedLectures.length === lectures.length &&
    (quizzes.length === 0 || quizzes.every((q) => q.latestAttempt?.isPassed));

  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const groupedLectures = lectures.reduce((acc, lecture) => {
    const section = lecture.sectionName || "Course Content";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(lecture);
    return acc;
  }, {});

  const groupedQuizzes = quizzes.reduce((acc, quiz) => {
    const section = quiz.sectionName || "Course Content";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(quiz);
    return acc;
  }, {});

  useEffect(() => {
    if (Object.keys(groupedLectures).length > 0) {
      const initialOpen = {};
      Object.keys(groupedLectures).forEach((section) => {
        initialOpen[section] = true;
      });
      setOpenSections(initialOpen);
    }
  }, [course]);

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // Gating Logic
  const getSectionStatus = (sectionName) => {
    const sectionIndex = Object.keys(groupedLectures).indexOf(sectionName);
    if (sectionIndex === 0) return "unlocked";

    const prevSectionName = Object.keys(groupedLectures)[sectionIndex - 1];
    const prevSectionLectures = groupedLectures[prevSectionName];

    // 1. All previous lectures must be completed
    const allPrevLecturesDone = prevSectionLectures.every((l) =>
      completedLectures.includes(l._id),
    );

    // 2. Previous section quiz must be passed (if it exists)
    const prevQuiz = quizzesData?.quizzes?.find(
      (q) => q.sectionName === prevSectionName,
    );

    if (!allPrevLecturesDone) return "locked";

    // If a quiz exists for the previous section, it must be passed
    if (prevQuiz && !prevQuiz.latestAttempt?.isPassed) {
      return "locked";
    }

    return "unlocked";
  };

  // NOTE: Download is now handled inside NotesTab.jsx (real per-lecture notes)

  const handleNextMilestone = () => {
    const currentSectionName = currentLecture?.sectionName || "Course Content";

    if (!quizzesData?.quizzes) {
      return toast.error("Quiz data is still loading. Please wait a moment.");
    }

    const sectionQuizzes = quizzesData.quizzes.filter(
      (q) =>
        q.sectionName?.trim().toLowerCase() ===
        currentSectionName.trim().toLowerCase(),
    );

    if (sectionQuizzes.length > 0) {
      // Find the first unpassed quiz in this section
      const nextQuiz = sectionQuizzes.find((q) => !q.latestAttempt?.isPassed);
      if (nextQuiz) {
        setActiveQuiz(nextQuiz);
        setShowQuiz(true);
      } else {
        toast.success(
          `You have passed all quizzes for "${currentSectionName}"!`,
        );
      }
    } else {
      toast(
        `No quiz found for "${currentSectionName}". Complete all lectures in this section to proceed.`,
        {
          icon: "ℹ️",
        },
      );
    }
  };

  const handleQuizComplete = (isPassed) => {
    setShowQuiz(false);
    if (isPassed) {
      queryClient.invalidateQueries(["courseQuizzes", id]);
      toast.success("Section Unlocked!");
    }
  };

  // Initialize first lecture as current if none selected
  useEffect(() => {
    if (lectures.length > 0 && !currentLecture) {
      setCurrentLecture(lectures[0]);
    }
  }, [lectures, currentLecture]);

  const handleNextLecture = () => {
    // Optional: Mark current as complete when clicking 'Next' if not already done
    if (!completedLectures.includes(currentLecture?._id)) {
      handleToggleComplete(currentLecture?._id);
    }

    const currentIndex = lectures.findIndex(
      (l) => l._id === currentLecture?._id,
    );
    if (currentIndex < lectures.length - 1) {
      setCurrentLecture(lectures[currentIndex + 1]);
      // Scroll to top of video area
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleToggleComplete = (lectureId) => {
    updateProgressMutation.mutate(lectureId || currentLecture?._id);
  };

  const tabs = ["About", "Curriculum", "Notes", "Forum", "Instructor", "Reviews"];
  const averageRating = reviewsData?.averageRating || 0;
  const totalReviews = reviewsData?.totalReviews || 0;
  const reviews = reviewsData?.reviews || [];
  const distribution = reviewsData?.distribution || {};

  const isLoading = isCourseLoading || isProgressLoading;
  const isError = isCourseError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400 font-medium animate-pulse">
          Initializing your classroom...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] p-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Failed to load course progress
        </h2>
        <Button onClick={() => navigate("/")} className="bg-blue-600">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a] text-white">
      <SEO title={`Learning: ${course?.courseTitle || 'Course'}`} />
      {/* 1. TOP NAVIGATION BAR */}
      <header className="h-16 border-b border-white/5 bg-[#1e293b]/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/courseDetails/${id}`)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none mb-1 line-clamp-1">
              {course?.courseTitle}
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              <span>
                {lectures.indexOf(currentLecture) + 1} of {lectures.length}{" "}
                Lectures
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-green-400 text-[9px] bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">
                Active Session
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              Your Progress
            </span>
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
          {isCourseComplete ? (
            <Button
              onClick={() => setIsCertificateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black h-10 px-6 rounded-xl shadow-lg shadow-amber-900/40 animate-bounce"
            >
              <Award className="w-4 h-4 mr-2" />
              Claim Certificate
            </Button>
          ) : (
            <Button
              onClick={handleNextLecture}
              disabled={lectures.indexOf(currentLecture) === lectures.length - 1}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-black h-10 px-6 rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete & Next
            </Button>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* 2. VIDEO & CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020617]">
          {/* Video Section */}
          <div className="relative aspect-video w-full bg-black shadow-2xl">
            {currentLecture?.videoUrl ? (
              currentLecture.videoUrl.includes("youtube.com") ||
              currentLecture.videoUrl.includes("youtu.be") ? (
                <iframe
                  src={
                    currentLecture.videoUrl.includes("watch?v=")
                      ? currentLecture.videoUrl.replace("watch?v=", "embed/")
                      : currentLecture.videoUrl.includes("youtu.be/")
                        ? currentLecture.videoUrl.replace(
                            "youtu.be/",
                            "youtube.com/embed/",
                          )
                        : currentLecture.videoUrl
                  }
                  className="w-full h-full"
                  allowFullScreen
                  title={currentLecture.lectureTitle}
                />
              ) : (
                <video
                  src={currentLecture.videoUrl}
                  controls
                  className="w-full h-full"
                  controlsList="nodownload"
                  key={currentLecture.videoUrl} // Force re-render on video change
                />
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-slate-900 to-black">
                <div className="p-8 rounded-full bg-white/5 border border-white/10 mb-6 group cursor-pointer hover:bg-white/10 transition-colors">
                  <PlayCircle className="h-16 w-12 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-xl font-black text-white/50 uppercase tracking-widest">
                  No video source available
                </h3>
                <p className="text-gray-500 text-sm mt-2 font-bold italic opacity-60">
                  This lecture might be text-only or still processing.
                </p>
              </div>
            )}


          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-white/5 sticky top-0 bg-[#020617]/95 backdrop-blur-md z-30 pt-2 px-8 lg:px-12">
            <div className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === tab
                      ? "text-blue-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.3)]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="max-w-4xl mx-auto p-8 lg:p-12">
            {activeTab === "About" && (
              <AboutTab
                course={course}
                currentLecture={currentLecture}
                lectures={lectures}
                completedLectures={completedLectures}
                handleToggleComplete={handleToggleComplete}
                updateProgressMutation={updateProgressMutation}
                setIsQAOpen={setIsQAOpen}
                setActiveTab={setActiveTab}
                isCourseCompleted={isCourseCompleted}
                setIsCertificateOpen={setIsCertificateOpen}
              />
            )}

            {activeTab === "Curriculum" && (
              <CurriculumTab
                lectures={lectures}
                quizzes={quizzes}
                groupedLectures={groupedLectures}
                openSections={openSections}
                toggleSection={toggleSection}
                completedLectures={completedLectures}
                currentLecture={currentLecture}
                setCurrentLecture={setCurrentLecture}
                getSectionStatus={getSectionStatus}
              />
            )}

            {activeTab === "Notes" && (
              <NotesTab courseId={id} currentLecture={currentLecture} />
            )}

            {activeTab === "Forum" && (
              <ForumTab courseId={id} user={user} />
            )}

            {activeTab === "Instructor" && (
              <InstructorTab course={course} averageRating={averageRating} />
            )}

            {activeTab === "Reviews" && (
              <ReviewsTab
                reviews={reviews}
                averageRating={averageRating}
                totalReviews={totalReviews}
                distribution={distribution}
                reviewHover={reviewHover}
                setReviewHover={setReviewHover}
                reviewRating={reviewRating}
                setReviewRating={setReviewRating}
                reviewComment={reviewComment}
                setReviewComment={setReviewComment}
                reviewMutation={reviewMutation}
                deleteReviewMutation={deleteReviewMutation}
                user={user}
              />
            )}
          </div>
        </div>

        {/* 3. LECTURE SIDEBAR */}

        <CourseSidebar
          lectures={lectures}
          currentLecture={currentLecture}
          setCurrentLecture={setCurrentLecture}
          groupedLectures={groupedLectures}
          groupedQuizzes={groupedQuizzes}
          openSections={openSections}
          toggleSection={toggleSection}
          completedLectures={completedLectures}
          getSectionStatus={getSectionStatus}
          handleToggleComplete={handleToggleComplete}
          handleNextMilestone={handleNextMilestone}
          setActiveQuiz={setActiveQuiz}
          setShowQuiz={setShowQuiz}
        />
      </main>

      {/* QUIZ PLAYER OVERLAY */}
      {showQuiz && activeQuiz && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-xl animate-in fade-in duration-300">
          <QuizPlayer quiz={activeQuiz} onComplete={handleQuizComplete} />
        </div>
      )}

      {/* Q&A MODAL */}
      <QAModal
        isOpen={isQAOpen}
        onOpenChange={setIsQAOpen}
        currentLecture={currentLecture}
        courseId={id}
      />

      {/* CERTIFICATE MODAL */}
      <CertificateModal
        isOpen={isCertificateOpen}
        onOpenChange={setIsCertificateOpen}
        user={user}
        course={course}
      />

      {/* Global CSS for scrollbar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `,
        }}
      />
    </div>
  );
};

export default CourseProgress;
