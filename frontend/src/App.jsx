import Layout from "./components/layout/Layout.jsx";
import { Routes, Route, Navigate } from "react-router-dom"; // Ensure Navigate is imported
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import SignUpPage from "./pages/auth/SignUpPage.jsx";
import { useQuery } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { axiosInstance } from "./lib/axios.js";

import NotificationsPage from "./pages/NotificationsPage";
import NetworkPage from "./pages/NetworkPage";
import PostPage from "./pages/PostPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const { data: authUser } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } catch (err) {
        if (err.response?.status === 401) {
          return null;
        }
        toast.error(err.response?.data?.message || "Something went wrong");
      }
    },
  });

  console.log("authUser", authUser);

  return (
    <Layout>
      <Routes>
        <Route path="/"element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path='/notifications' element={authUser ? <NotificationsPage /> : <Navigate to={"/login"} />} />
				<Route path='/network' element={authUser ? <NetworkPage /> : <Navigate to={"/login"} />} />
				<Route path='/post/:postId' element={authUser ? <PostPage /> : <Navigate to={"/login"} />} />
				<Route path='/profile/:username' element={authUser ? <ProfilePage /> : <Navigate to={"/login"} />} />
      </Routes>
      <Toaster />
    </Layout>
  );
}

export default App;
