import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { Link } from "react-router-dom";
import { Bell, Home, LogOut, User, Users } from "lucide-react";

const Navbar = () => {
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();

	const { data: notifications } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => axiosInstance.get("/notifications"),
		enabled: !!authUser,
	});

	const { data: connectionRequests } = useQuery({
		queryKey: ["connectionRequests"],
		queryFn: async () => axiosInstance.get("/connections/requests"),
		enabled: !!authUser,
	});

	const { mutate: logout } = useMutation({
		mutationFn: () => axiosInstance.post("/auth/logout"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
	});

	const unreadNotificationCount = notifications?.data.filter((notif) => !notif.read).length;
	const unreadConnectionRequestsCount = connectionRequests?.data?.length;

	return (
		<nav className="shadow-md sticky top-0 z-10 bg-[#020916]">
  <div className="max-w-7xl mx-auto px-4 bg-[#020916]">
				<div className='flex justify-between items-center py-3'>
					<div className='flex items-center space-x-4'>
						<Link to='/'>
							<img className='h-12 rounded' src="../../src/assets/logo2.png" alt='Blackbook' />
						</Link>
					</div>
					<div className='flex items-center gap-2 md:gap-6'>
						{authUser ? (
							<>
								<Link to={"/"} className='text-white hover:text-gray-700 flex flex-col items-center'>
									<Home size={20} />
									<span className='text-xs hidden md:block'>Home</span>
								</Link>
								<Link to='/network' className='text-white hover:text-gray-700 flex flex-col items-center relative'>
									<Users size={20} />
									<span className='text-xs hidden md:block'>My Network</span>
									{unreadConnectionRequestsCount > 0 && (
										<span
											className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
										rounded-full size-3 md:size-4 flex items-center justify-center'
										>
											{unreadConnectionRequestsCount}
										</span>
									)}
								</Link>
								<Link to='/notifications' className='text-white hover:text-gray-700 flex flex-col items-center relative'>
									<Bell size={20} />
									<span className='text-xs hidden md:block'>Notifications</span>
									{unreadNotificationCount > 0 && (
										<span
											className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
										rounded-full size-3 md:size-4 flex items-center justify-center'
										>
											{unreadNotificationCount}
										</span>
									)}
								</Link>
								<Link
									to={`/profile/${authUser.username}`}
									className='text-white hover:text-gray-700 flex flex-col items-center'
								>
									<User size={20} />
									<span className='text-xs hidden md:block'>Me</span>
								</Link>
								<button
									className='flex items-center space-x-1 text-sm text-white hover:text-gray-500'
									onClick={() => logout()}
								>
									<LogOut size={20} />
									<span className='hidden md:inline'>Logout</span>
								</button>
							</>
						) : (
							<>
								<Link to='/login' className='btn w-[100px] text-white bg-blue-500 hover:bg-blue-600 border-none'>
    Sign In
</Link>
<Link to='/signup' className='btn w-[100px] text-white bg-blue-500 hover:bg-blue-600 border-none'>
    Join now
</Link>

							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};
export default Navbar;