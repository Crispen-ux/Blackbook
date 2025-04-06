import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

const LoginForm = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const queryClient = useQueryClient();

  const { mutate: loginMutation, isLoading } = useMutation({
    mutationFn: async (userData) => {
      try {
        // Make the POST request to login
        const res = await axiosInstance.post("/auth/login", userData, {
          withCredentials: true, // Ensures cookies are included in the request
        });
        
        // Log the response (for debugging)
        console.log("Login successful, response data:", res.data);
        
        // Return the data received from the backend
        return res.data;
      } catch (error) {
        // Log the error for debugging
        console.error("Error during login:", error.response?.data || error.message);
        
        // Throw the error to be caught in onError handler
        throw error;
      }
    },
    onSuccess: (data) => {
      // Handle successful login
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success("Login successful!");
      console.log("Login data:", data); // Log the data to see the response
    },
    onError: (err) => {
      // Handle errors
      toast.error(err.response?.data?.message || "Something went wrong");
      console.log("Error during login:", err.response?.data || err.message);
    },
  });
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md text-black">
      <input
        type="text"
        name="username"
        placeholder="Username"
        value={formData.username}
        onChange={handleChange}
        className="input input-bordered w-full"
        required
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        className="input input-bordered w-full"
        required
      />
      <button
        type="submit"
        className="btn bg-blue-500 hover:bg-blue-600 w-full text-white rounded-lg"
        disabled={isLoading}
      >
        {isLoading ? <Loader className="size-5 animate-spin" /> : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
