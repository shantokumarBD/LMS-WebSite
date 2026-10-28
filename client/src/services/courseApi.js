import api from "../lib/api";

// create a new course

export const createCourse = async (courseData) => {
  const response = await api.post("/courses", courseData);
  return response.data;
};

// get Courses created by the logged in user

export const getInstructorCourses = async () => {
  const response = await api.get("/courses");
  return response.data.courses;
};

// edit a course

export const editCourse = async (courseId, courseData) => {
  const response = await api.put(`/courses/${courseId}`, courseData);
  return response.data;
};

// get course by id
export const getCourseById = async (courseId) => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
};

// create lecture
export const createLectureService = async (
  courseId,
  lectureTitle,
  sectionName,
) => {
  const response = await api.post(`/courses/${courseId}/lectures`, {
    lectureTitle,
    sectionName,
  });
  return response.data;
};

export const deleteCourseService = async (courseId) => {
  const response = await api.delete(`/courses/${courseId}`);
  return response.data;
};

// edit lecture
export const editLectureService = async (
  courseId,
  lectureId,
  lectureData,
  onUploadProgress,
) => {
  const response = await api.put(
    `/courses/${courseId}/lectures/${lectureId}`,
    lectureData,
    {
      onUploadProgress: onUploadProgress,
    },
  );
  return response.data;
};

// delete lecture
export const deleteLectureService = async (courseId, lectureId) => {
  const response = await api.delete(
    `/courses/${courseId}/lectures/${lectureId}`,
  );
  return response.data;
};

// toggle publish course
export const togglePublishCourse = async (courseId) => {
  const response = await api.patch(`/courses/${courseId}/publish`);
  return response.data;
};

// get published courses
export const getPublishedCourses = async () => {
  const response = await api.get("/courses/published");
  return response.data.courses;
};

// search and filter courses
export const searchCoursesService = async ({
  query,
  categories,
  levels,
  sort,
  page,
  limit = 12,
}) => {
  const params = new URLSearchParams();
  if (query) params.append("search", query);
  if (categories) categories.forEach((c) => params.append("categories", c));
  if (levels) levels.forEach((l) => params.append("levels", l));
  if (sort) params.append("sort", sort);
  if (page) params.append("page", page);
  params.append("limit", limit.toString());

  const response = await api.get(`/courses/published?${params.toString()}`);
  return response.data;
};

// Enrollment and Wishlist
export const enrollCourseService = async (courseId) => {
  const response = await api.post(`/courses/${courseId}/enroll`);
  return response.data;
};

export const toggleWishlistService = async (courseId) => {
  const response = await api.post(`/courses/${courseId}/wishlist`);
  return response.data;
};

export const getCourseStatusService = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/status`);
  return response.data;
};

// Purchase / Payment
export const createCheckoutSessionService = async (courseId, couponCode) => {
  const courseIds = Array.isArray(courseId) ? courseId : [courseId];
  const response = await api.post(`/purchase/checkout`, {
    courseIds,
    courseId: courseIds[0],
    couponCode,
  });
  return response.data;
};

export const getDashboardStatsService = async () => {
  const response = await api.get("/purchase/stats");
  return response.data;
};

// Course Progress Services
export const getUserCourseProgressService = async (courseId) => {
  const response = await api.get(`/progress/${courseId}`);
  return response.data;
};

export const updateLectureProgressService = async (courseId, lectureId) => {
  const response = await api.post(
    `/progress/${courseId}/lectures/${lectureId}/view`,
  );
  return response.data;
};

export const resetCourseProgressService = async (courseId) => {
  const response = await api.post(`/progress/${courseId}/reset`);
  return response.data;
};

// Review Services
export const getCourseReviewsService = async (courseId) => {
  const response = await api.get(`/reviews/${courseId}`);
  return response.data;
};

export const submitReviewService = async (courseId, reviewData) => {
  const response = await api.post(`/reviews/${courseId}`, reviewData);
  return response.data;
};

export const deleteReviewService = async (courseId) => {
  const response = await api.delete(`/reviews/${courseId}`);
  return response.data;
};

// Instructor Profile
export const getInstructorProfileService = async (instructorId) => {
  const response = await api.get(`/users/instructor/${instructorId}`);
  return response.data;
};

// Section Operations
export const renameSectionService = async (
  courseId,
  oldSectionName,
  newSectionName,
) => {
  const response = await api.patch(`/courses/${courseId}/sections/rename`, {
    oldSectionName,
    newSectionName,
  });
  return response.data;
};

export const deleteSectionService = async (courseId, sectionName) => {
  const response = await api.delete(`/courses/${courseId}/sections/delete`, {
    data: { sectionName },
  });
  return response.data;
};

// --- INSTRUCTOR STUDENT MANAGEMENT ---
export const getCourseStudentsService = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/students`);
  return response.data;
};
