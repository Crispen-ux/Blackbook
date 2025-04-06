import { X } from "lucide-react";
import { useState } from "react";

const SkillsSection = ({ userData, isOwnProfile, onSave }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [skills, setSkills] = useState(userData.skills || []);
	const [newSkill, setNewSkill] = useState("");

	const handleAddSkill = () => {
		if (newSkill && !skills.includes(newSkill)) {
			setSkills([...skills, newSkill]);
			setNewSkill("");
		}
	};

	const handleDeleteSkill = (skill) => {
		setSkills(skills.filter((s) => s !== skill));
	};

	const handleSave = () => {
		onSave({ skills });
		setIsEditing(false);
	};

	return (
		<div className='bg-gray-900 shadow rounded-lg p-6'>
			<h2 className='text-xl font-semibold mb-4'>Skills</h2>
			<div className='flex flex-wrap'>
				{skills.map((skill, index) => (
					<span
						key={index}
						className='bg-green-500 text-white px-3 py-1 rounded text-sm mr-2 mb-2 flex items-center'
					>
						{skill}
						{isEditing && (
							<button onClick={() => handleDeleteSkill(skill)} className='ml-2 text-red-500'>
								<X size={14} />
							</button>
						)}
					</span>
				))}
			</div>

			{isEditing && (
				<div className='mt-4 flex'>
					<input
						type='text'
						placeholder='New Skill'
						value={newSkill}
						onChange={(e) => setNewSkill(e.target.value)}
						className='flex-grow p-2 border rounded-l'
					/>
					<button
						onClick={handleAddSkill}
						className='bg-teal-600 text-white py-2 px-4 rounded w-[200px]  hover:bg-teal-300 ml-5 transition duration-300'
					>
						Add Skill
					</button>
				</div>
			)}

			{isOwnProfile && (
				<>
					{isEditing ? (
						<button
							onClick={handleSave}
							className='mt-4 bg-teal-600 text-white py-2 px-4 rounded w-[200px]  hover:bg-teal-300 transition duration-300'
						>
							Save Changes
						</button>
					) : (
						<button
							onClick={() => setIsEditing(true)}
							className='mt-4 text-gray-400 hover:text-gray-600 transition duration-300'
						>
							Edit Skills
						</button>
					)}
				</>
			)}
		</div>
	);
};
export default SkillsSection;