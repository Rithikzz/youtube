/**
 * Comments Component - YourTube 2.0
 * 
 * Features Implemented:
 * 1. 🌐 Google Translate Integration (Real-time translation to viewer's browser language)
 * 2. 👍/👎 Likes & Dislikes (Interactive comment evaluation, tracked per user)
 * 3. 🛡️ Auto-Moderation (Automatic deletion upon receiving 2+ dislikes)
 * 4. 📍 Geolocation & City Detection (Detects and displays user's city via backend IP lookup)
 * 5. 🚫 Spam & Special Character Blocking (Filters out suspicious characters @, #, $, %, ^, &, *)
 * 6. ⚡ Real-Time Sync (Updates instantly via Socket.io for all connected viewers)
 */
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: string[] | number;
  dislikes?: string[] | number;
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

  useEffect(() => {
    loadComments();

    // ─── Socket.io Connection & Listening ────────────────────────────────────
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("join-video", videoId);
    });

    socket.on("comment:new", (newCommentData: Comment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newCommentData._id)) return prev;
        return [newCommentData, ...prev];
      });
    });

    socket.on("comment:updated", (updatedCommentData: Comment) => {
      setComments((prev) =>
        prev.map((c) => (c._id === updatedCommentData._id ? updatedCommentData : c))
      );
    });

    socket.on("comment:deleted", (deletedId: string) => {
      setComments((prev) => prev.filter((c) => c._id !== deletedId));
    });

    return () => {
      socket.emit("leave-video", videoId);
      socket.off("comment:new");
      socket.off("comment:updated");
      socket.off("comment:deleted");
      socket.disconnect();
    };
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
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
      });
      if (res.data.comment) {
        setComments((prev) => {
          if (prev.some((c) => c._id === res.data.data._id)) return prev;
          return [res.data.data, ...prev];
        });
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
    } catch (error: any) {
      console.log(error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert("Could not update comment");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error: any) {
      console.log(error);
      if (error.response && error.response.status === 404) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        alert("This comment has been deleted.");
      }
    }
  };

  const handleLike = async (id: string) => {
    if (!user) {
      alert("Please sign in to like comments.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/like/${id}`, { userId: user._id });
      setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
    } catch (error: any) {
      console.log(error);
      if (error.response && error.response.status === 404) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        alert("This comment has been deleted.");
      }
    }
  };

  const handleDislike = async (id: string) => {
    if (!user) {
      alert("Please sign in to dislike comments.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/dislike/${id}`, { userId: user._id });
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      } else {
        setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      }
    } catch (error: any) {
      console.log(error);
      if (error.response && error.response.status === 404) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        alert("This comment has been deleted.");
      }
    }
  };

  const handleTranslate = async (commentId: string, text: string) => {
    if (translations[commentId]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      return;
    }
    
    setTranslatingId(commentId);
    try {
      const preferredLang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${preferredLang}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data && data[0]) {
        const translatedText = data[0].map((item: any) => item[0]).join("");
        setTranslations((prev) => ({ ...prev, [commentId]: translatedText }));
      } else {
        alert("Translation format error");
      }
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
          comments.map((comment) => {
            const hasLiked = user && Array.isArray(comment.likes) && comment.likes.includes(user._id);
            const hasDisliked = user && Array.isArray(comment.dislikes) && comment.dislikes.includes(user._id);
            const likesCount = Array.isArray(comment.likes) ? comment.likes.length : (comment.likes || 0);
            const dislikesCount = Array.isArray(comment.dislikes) ? comment.dislikes.length : (comment.dislikes || 0);

            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
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
                        <button 
                          onClick={() => handleLike(comment._id)} 
                          className={`flex items-center gap-1 transition-colors ${
                            hasLiked ? "text-blue-500 font-medium" : "hover:text-blue-500"
                          }`}
                        >
                          <span>👍</span> {likesCount}
                        </button>
                        <button 
                          onClick={() => handleDislike(comment._id)} 
                          className={`flex items-center gap-1 transition-colors ${
                            hasDisliked ? "text-red-500 font-medium" : "hover:text-red-500"
                          }`}
                        >
                          <span>👎</span> {dislikesCount}
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
