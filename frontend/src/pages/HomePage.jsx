import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import PostCreation from "../components/PostCreation";
import Post from "../components/Post";
import { Users } from "lucide-react";
import RecommendedUser from "../components/RecommendedUser";

const HomePage = () => {
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const { data: recommendedUsers } = useQuery({
		queryKey: ["recommendedUsers"],
		queryFn: async () => {
			const res = await axiosInstance.get("/users/suggestions");
			return res.data;
		},
	});

	const { data: posts } = useQuery({
		queryKey: ["posts"],
		queryFn: async () => {
			const res = await axiosInstance.get("/posts");
			return res.data;
		},
	});

	console.log("posts", posts);

	return (
		<div className=' grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[#020916]'>
			<div className='hidden lg:block lg:col-span-1 mb-5'>
				<Sidebar user={authUser} />
			</div>

			<div className='col-span-1 lg:col-span-2 order-first lg:order-none mb-5'>
				<PostCreation user={authUser} />

				{posts?.map((post) => (
					<Post key={post._id} post={post} />
				))}

				{posts?.length === 0 && (
					<div className=' rounded-lg shadow p-8 text-center'>
						<div className='mb-6 '>
							<Users size={64} className='mx-auto text-white' />
						</div>
						<h2 className='text-2xl font-bold mb-4 text-gray-400'>No Posts Yet</h2>
						<p className='text-gray-400 mb-6'>Connect with others to start seeing posts in your feed!</p>
					</div>
				)}
			</div>

			{recommendedUsers?.length > 0 && (
				<div className='col-span-1 lg:col-span-1 hidden lg:block mt-5 mr-5'>
					<div className='bg-[#111926] rounded-lg shadow p-4  '>
						<h2 className='font-semibold text-white mb-4'>People you may know</h2>
						{recommendedUsers?.map((user) => (
							<RecommendedUser key={user._id} user={user} />
						))}
					</div>
				</div>
			)}
		</div>
	);
};
export default HomePage;