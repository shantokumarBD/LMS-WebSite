import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import GlobalErrorPage from "@/components/GlobalErrorPage";
import ProtectedRoute from "@/components/ProtectedRoute";

// Lazy Load Pages
const Home = lazy(() => import("@/Pages/Home"));
const Courses = lazy(() => import("@/Pages/Courses"));
const Login = lazy(() => import("@/Pages/auth/Login"));
const Signup = lazy(() => import("@/Pages/auth/Signup"));
const Profile = lazy(() => import("@/Pages/Profile"));
const AdminDashboard = lazy(() => import("@/Pages/admin/AdminDashboard"));
const AdminHome = lazy(() => import("@/Pages/admin/Dashboard"));
const AdminCourses = lazy(() => import("@/Pages/admin/Course"));
const CreateCourse = lazy(() => import("@/Pages/admin/CreateCourse"));
const EditCourse = lazy(() => import("@/Pages/admin/UpdateCourse"));
const Lectures = lazy(() => import("@/Pages/admin/CreateLecture"));
const EditLecture = lazy(() => import("@/Pages/admin/EditLecture"));
const AdminQuizManager = lazy(() => import("@/Pages/admin/AdminQuizManager"));
const CourseCardDetails = lazy(() => import("@/components/CourseCardDetails"));
const CourseProgress = lazy(() => import("@/Pages/CourseProgress"));
const PurchaseSuccess = lazy(() => import("@/Pages/PurchaseSuccess"));
const InstructorProfile = lazy(() => import("@/Pages/InstructorProfile"));
const NotFound = lazy(() => import("@/Pages/NotFound"));
const ForgotPassword = lazy(() => import("@/Pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/Pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("@/Pages/auth/VerifyEmail"));
const SearchPage = lazy(() => import("@/Pages/SearchPage"));
const MyEnrolledCourses = lazy(() => import("@/Pages/MyEnrolledCourses"));
const Wishlist = lazy(() => import("@/Pages/Wishlist"));
const About = lazy(() => import("@/Pages/About"));
const Contact = lazy(() => import("@/Pages/Contact"));
const Terms = lazy(() => import("@/Pages/Terms"));
const Privacy = lazy(() => import("@/Pages/Privacy"));
const Certificate = lazy(() => import("@/Pages/student/Certificate"));
const AdminUsers = lazy(() => import("@/Pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("@/Pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("@/Pages/admin/AdminSettings"));
const AdminHelpCenter = lazy(() => import("@/Pages/admin/AdminHelpCenter"));
const AdminQuizHome = lazy(() => import("@/Pages/admin/AdminQuizHome"));
const AdminCategories = lazy(() => import("@/Pages/admin/AdminCategories"));
const BlogPage = lazy(() => import("@/Pages/Blog/BlogPage"));
const BlogDetails = lazy(() => import("@/Pages/Blog/BlogDetails"));
const AllBlogs = lazy(() => import("@/Pages/Blog/AllBlogs"));
const AdminBlogs = lazy(() => import("@/Pages/admin/AdminBlogs"));
const AdminCreateBlog = lazy(() => import("@/Pages/admin/AdminCreateBlog"));
const AdminCoupons = lazy(() => import("@/Pages/admin/AdminCoupons"));
const AdminAdSense = lazy(() => import("@/Pages/admin/AdminAdSense"));
const AdminNotifications = lazy(() => import("@/Pages/admin/AdminNotifications"));
const Leaderboard = lazy(() => import("@/Pages/Leaderboard"));
const VerifyCertificate = lazy(() => import("@/Pages/VerifyCertificate"));
const Notes = lazy(() => import("@/Pages/Notes"));
const CartItems = lazy(() => import("@/Pages/Cart"));
const QAPage = lazy(() => import("@/Pages/QAPage"));
const StudentManagement = lazy(() => import("@/Pages/teacher/StudentManagement"));
const ForumHome = lazy(() => import("@/Pages/Forum/ForumHome"));
const ForumPostDetails = lazy(() => import("@/Pages/Forum/PostDetails"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <GlobalErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/courses",
        element: <Courses />,
      },
      {
        path: "/blog",
        element: <BlogPage />,
      },
      {
        path: "/blogs",
        element: <AllBlogs />,
      },
      {
        path: "/blog/:identifier",
        element: <BlogDetails />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
      {
        path: "/leaderboard",
        element: <Leaderboard />,
      },
      {
        path: "/verify-certificate/:id",
        element: <VerifyCertificate />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/reset-password/:token",
        element: <ResetPassword />,
      },
      {
        path: "/verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/purchase-success",
        element: (
          <ProtectedRoute>
            <PurchaseSuccess />
          </ProtectedRoute>
        ),
      },
      {
        path: "/course-progress/:id",
        element: (
          <ProtectedRoute>
            <CourseProgress />
          </ProtectedRoute>
        ),
      },
      {
        path: "/courseDetails/:id",
        element: <CourseCardDetails />,
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/terms",
        element: <Terms />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
      {
        path: "/my-learning",
        element: (
          <ProtectedRoute>
            <MyEnrolledCourses />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cart",
        element: (
          <ProtectedRoute>
            <CartItems />
          </ProtectedRoute>
        ),
      },
      {
        path: "/wishlist",
        element: (
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        ),
      },
      {
        path: "/certificate/:id",
        element: (
          <ProtectedRoute>
            <Certificate />
          </ProtectedRoute>
        ),
      },
      {
        path: "/instructor/:id",
        element: <InstructorProfile />,
      },
      {
        path: "/notes",
        element: (
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        ),
      },
      {
        path: "/qa",
        element: (
          <ProtectedRoute>
            <QAPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forum",
        element: (
          <ProtectedRoute>
            <ForumHome />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forum/post/:postId",
        element: (
          <ProtectedRoute>
            <ForumPostDetails />
          </ProtectedRoute>
        ),
      },
      // Admin Routes
      {
        path: "/admin",
        element: (
          <ProtectedRoute roles={["admin", "teacher"]}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "",
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <AdminHome />,
          },
          {
            path: "courses",
            element: <AdminCourses />,
          },
          {
            path: "createCourse",
            element: <CreateCourse />,
          },
          {
            path: "courses/:id",
            element: <EditCourse />,
          },
          {
            path: "courses/:id/lectures",
            element: <Lectures />,
          },
          {
            path: "courses/:id/lectures/:lectureId",
            element: <EditLecture />,
          },
          {
            path: "courses/:id/quizzes",
            element: <AdminQuizManager />,
          },
          {
            path: "quizzes",
            element: <AdminQuizHome />,
          },
          {
            path: "users",
            element: <AdminUsers />,
          },
          {
            path: "analytics",
            element: <AdminAnalytics />,
          },
          {
            path: "settings",
            element: <AdminSettings />,
          },
          {
            path: "help",
            element: <AdminHelpCenter />,
          },
          {
            path: "categories",
            element: <AdminCategories />,
          },
          {
            path: "blogs",
            element: <AdminBlogs />,
          },
          {
            path: "createBlog",
            element: <AdminCreateBlog />,
          },
          {
            path: "blogs/:id",
            element: <AdminCreateBlog />,
          },
          {
            path: "adsense",
            element: <AdminAdSense />,
          },
          {
            path: "coupons",
            element: <AdminCoupons />,
          },
          {
            path: "notifications",
            element: <AdminNotifications />,
          },
          {
            path: "courses/:id/students",
            element: <StudentManagement />,
          },
        ],
      },
      // 404 Route
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
