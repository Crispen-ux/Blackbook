import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import PostThread from "@/components/forms/PostThread";
import { fetchUser } from "@/lib/actions/user.actions";

async function Page() {
  const user = await currentUser();
  if (!user) return null;

  // Fetch user information
  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  // Ensure userInfo._id is a string before passing it to the client component
  const userId = userInfo._id ? userInfo._id.toString() : "";

  return (
    <>
      <h1 className="head-text">Create Thread</h1>
      <PostThread userId={userId} />
    </>
  );
}

export default Page;
