import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios.js";
import { toast } from "react-hot-toast";
import { Loader } from "lucide-react";

const SignUpForm = () => {
	const [formData, setFormData] = useState({
		name: "",
		username: "",
		email: "",
		password: "",
	});

	const queryClient = useQueryClient();

	const { mutate: signUpMutation, isLoading } = useMutation({
		mutationFn: async (data) => {
			const res = await axiosInstance.post("/auth/signup", data);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			toast.success("Account created successfully!");
		},
		onError: (err) => {
			toast.error(err.response?.data?.message || "Something went wrong");
		},
	});

	const handleChange = (e) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSignUp = (e) => {
		e.preventDefault();
		signUpMutation(formData);
	};

	return (
		<form onSubmit={handleSignUp} className="flex flex-col gap-4 w-full max-w-md text-black">
			<input
				type="text"
				name="name"
				placeholder="Full name"
				value={formData.name}
				onChange={handleChange}
				className="input input-bordered w-full"
				required
			/>
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
				type="email"
				name="email"
				placeholder="Email"
				value={formData.email}
				onChange={handleChange}
				className="input input-bordered w-full"
				required
			/>
			<input
				type="password"
				name="password"
				placeholder="Password (6+ characters)"
				value={formData.password}
				onChange={handleChange}
				className="input input-bordered w-full"
				required
			/>

			<button type="submit" disabled={isLoading} className="btn bg-blue-500 hover:bg-blue-600 rounded-lg w-full text-white">
				{isLoading ? <Loader className="size-5 animate-spin" /> : "Agree & Join"}
			</button>
		</form>
	);
};

export default SignUpForm;
