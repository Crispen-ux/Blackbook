import { Link } from "react-router-dom";
import { Home, UserPlus, Bell, User } from "lucide-react";
import avatar from '../assets/avatar.png'

export default function Sidebar({ user }) {
	return (
		<div className='bg-[#111926] rounded-lg shadow mt-5 ml-5'>
			<div className='p-4 text-center'>
				<div
					className='h-16 rounded-t-lg bg-cover bg-center bg-[#111926]'
					style={{
						backgroundImage: `url("${user.bannerImg || "/banner.png"}")`,
					}}
				/>
				<Link to={`/profile/${user.username}`}>
					<img
						src={user.profilePicture || avatar}
						alt={user.name}
						className='w-20 h-20 text-white rounded-full mx-auto mt-[-40px]'
					/>
					<h2 className='text-xl text-white font-semibold mt-2'>{user.name}</h2>
				</Link>
				<p className=' text-white'>{user.headline}</p>
				<p className=' text-gray-400 text-xs'>{user.connections.length} connections</p>
			</div>
			<div className='w-7/8 mx-auto mt-4 pb-4 pt-4 border-t border-gray-400 '>
				<nav>
					<ul className='space-y-2 justify-left'>
						<li>
							<Link
								to='/'
								className='flex items-center text-white py-2 px-4 rounded-md hover:bg-teal-600 text:white hover:text-white transition-colors'
							>
								<Home className='mr-2 text-white' size={20} /> Home
							</Link>
						</li>
						<li>
							<Link
								to='/network'
								className='flex items-center text-white py-2 px-4 rounded-md hover:bg-teal-600 hover:text-white transition-colors'
							>
								<UserPlus className='mr-2 text-white' size={20} /> My Network
							</Link>
						</li>
						<li>
							<Link
								to='/notifications'
								className='flex items-center  text-white py-2 px-4 rounded-md hover:bg-teal-600 hover:text-white transition-colors'
							>
								<Bell className='mr-2' size={20} /> Notifications
							</Link>
						</li>

						<li>
							<Link
								to={`/profile/${user.username}`}
								className='flex items-center text-white py-2 px-4 rounded-md hover:bg-teal-600 hover:text-white transition-colors'
							>
								<User className='mr-2' size={20} /> Profile
							</Link>
						</li>
					</ul>
				</nav>
				<div>
				
			</div>
			</div>
		
		</div>
	);
}