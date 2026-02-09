"use client";

import { useState } from "react";
import type { Comment } from "@/lib/types";

import CommentForm from "./CommentForm";
import Lightbox from "@/components/ui/Lightbox";

interface CommentCardProps {
  comment: Comment;
  depth?: number;
}

export default function CommentCard({ comment, depth = 0 }: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isTextLightbox, setIsTextLightbox] = useState(false);

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const avatarColors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
  ];

  const colorIndex =
    comment.userName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    avatarColors.length;

  const handleAttachmentClick = () => {
    if (!comment.attachment) return;

    const url = comment.attachment.url;
    const isText = comment.attachment.contentType === "text/plain";

    setIsTextLightbox(isText);
    setLightboxSrc(url);
  };

  const isImageAttachment = comment.attachment?.contentType?.startsWith("image/");
  const isTextAttachment = comment.attachment?.contentType === "text/plain";

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${avatarColors[colorIndex]}`}
          >
            {comment.userName[0].toUpperCase()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-gray-800">
                {comment.userName}
              </span>
              <a
                href={`mailto:${comment.email}`}
                className="text-xs text-primary-500 hover:text-primary-600 hover:underline"
              >
                {comment.email}
              </a>
              {comment.homePage && (
                <a
                  href={comment.homePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-500 hover:text-primary-600 hover:underline"
                >
                  [website]
                </a>
              )}
              <span className="text-xs text-gray-400">{formattedDate}</span>
            </div>

            {/* Comment text */}
            <div
              className="mt-1.5 text-sm text-gray-700 leading-relaxed comment-content"
              dangerouslySetInnerHTML={{ __html: comment.text }}
            />

            {/* Attachment */}
            {comment.attachment && (
              <div className="mt-2">
                {isImageAttachment && (
                  <button
                    onClick={handleAttachmentClick}
                    className="group relative inline-block"
                  >
                    <img
                      src={comment.attachment.url}
                      alt={comment.attachment.fileName}
                      className="w-32 h-32 object-cover rounded-md border-2 border-gray-200 group-hover:border-red-500 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-md transition-colors flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </button>
                )}
                {isTextAttachment && (
                  <button
                    onClick={handleAttachmentClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {comment.attachment.fileName}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-2">
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-gray-400 hover:text-primary-600 font-medium transition-colors"
              >
                {showReplyForm ? "Cancel Reply" : "Reply"}
              </button>
            </div>

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-3">
                <CommentForm
                  parentCommentId={comment.id}
                  onSuccess={() => setShowReplyForm(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt={comment.attachment?.fileName}
          isTextFile={isTextLightbox}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}
