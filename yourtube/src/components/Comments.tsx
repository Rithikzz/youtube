/**
 * Comments Component - YourTube 2.0
 * 
 * Features Implemented:
 * 1. 🌐 Google Translate Integration (Real-time translation to English)
 * 2. 👍/👎 Likes & Dislikes (Interactive comment evaluation)
 * 3. 🛡️ Auto-Moderation (Automatic deletion upon receiving 2+ dislikes)
 * 4. 📍 Geolocation & City Detection (Detects and displays user's city via IP lookup)
 * 5. 🚫 Spam & Special Character Blocking (Filters out suspicious characters @, #, $, %, ^, &, *)
 */
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: number;
  dislikes?: number;
  city?: string;
  language?: string;
}
const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const fetchedComments = [
    {
      _id: "1",
      videoid: videoId,
      userid: "1",
      commentbody: "Great video! Really enjoyed watching this.",
      usercommented: "John Doe",
      commentedon: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "2",
      videoid: videoId,
      userid: "2",
      commentbody: "Thanks for sharing this amazing content!",
      usercommented: "Jane Smith",
      commentedon: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div>Loading history...</div>;
  }
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    let city = "Unknown";
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      const ipData = await ipRes.json();
      if (ipData && ipData.city) {
        city = ipData.city;
      }
    } catch (err) {
      console.error("Could not fetch city:", err);
    }

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: city,
      });
      if (res.data.comment) {
        setComments([res.data.data, ...comments]);
      }
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await axiosInstance.post(`/comment/like/${id}`);
      setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (id: string) => {
    try {
      const res = await axiosInstance.post(`/comment/dislike/${id}`);
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      } else {
        setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTranslate = async (commentId: string, text: string) => {
    if (translations[commentId]) {
      // Toggle off
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      return;
    }
    
    setTranslatingId(commentId);
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      const translatedText = data[0][0][0];
      setTranslations((prev) => ({ ...prev, [commentId]: translatedText }));
    } catch (error) {
      console.error("Translation error:", error);
      alert("Could not translate comment");
    } finally {
      setTranslatingId(null);
    }
  };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented} {comment.city && <span className="text-gray-500 font-normal">• {comment.city}</span>}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{comment.commentbody}</p>
                    
                    {translations[comment._id] && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm italic border-l-2 border-blue-500">
                        <span className="font-semibold text-xs text-gray-500 block mb-1">Translated:</span>
                        {translations[comment._id]}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <button onClick={() => handleLike(comment._id)} className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                        <span>👍</span> {comment.likes || 0}
                      </button>
                      <button onClick={() => handleDislike(comment._id)} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                        <span>👎</span> {comment.dislikes || 0}
                      </button>
                      <button 
                        onClick={() => handleTranslate(comment._id, comment.commentbody)} 
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                        disabled={translatingId === comment._id}
                      >
                        <span>🌐</span> {translatingId === comment._id ? "Translating..." : (translations[comment._id] ? "Show Original" : "Translate")}
                      </button>

                      {comment.userid === user?._id && (
                        <>
                          <button onClick={() => handleEdit(comment)} className="hover:text-gray-700 dark:hover:text-gray-300">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(comment._id)} className="hover:text-red-500">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
