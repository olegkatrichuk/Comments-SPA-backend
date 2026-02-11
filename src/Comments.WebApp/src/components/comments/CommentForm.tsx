"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { commentSchema, type CommentFormValues } from "@/lib/validation";
import { getCaptcha } from "@/lib/api";
import { useCreateComment } from "@/hooks/useCreateComment";
import type { CaptchaData } from "@/lib/types";
import HtmlToolbar from "@/components/ui/HtmlToolbar";
import FileUpload from "@/components/ui/FileUpload";
import CommentPreview from "./CommentPreview";

interface CommentFormProps {
  parentCommentId?: string;
  onSuccess?: () => void;
}

export default function CommentForm({
  parentCommentId,
  onSuccess,
}: CommentFormProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const createComment = useCreateComment();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      userName: "",
      email: "",
      homePage: "",
      text: "",
      captchaAnswer: "",
    },
  });

  const watchText = watch("text");
  const watchUserName = watch("userName");

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptcha(data);
      setValue("captchaAnswer", "");
    } catch (err) {
      console.error("Failed to load captcha:", err);
    } finally {
      setCaptchaLoading(false);
    }
  }, [setValue]);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const { ref: textareaFormRef, ...textareaRegister } = register("text");

  const onSubmit = async (data: CommentFormValues) => {
    if (!captcha) return;

    try {
      await createComment.mutateAsync({
        userName: data.userName,
        email: data.email,
        homePage: data.homePage || undefined,
        text: data.text,
        parentCommentId,
        captchaKey: captcha.key,
        captchaAnswer: data.captchaAnswer,
        attachment: selectedFile || undefined,
      });

      reset();
      setSelectedFile(null);
      setShowPreview(false);
      await loadCaptcha();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
      await loadCaptcha();
    }
  };

  const handleTextChange = (newText: string) => {
    setValue("text", newText, { shouldValidate: true });
  };

  const isReply = !!parentCommentId;

  return (
    <div
      className={`${
        isReply
          ? "bg-gray-50 border border-gray-200 rounded-lg p-4"
          : "bg-white border border-gray-200 rounded-xl shadow-sm p-6"
      }`}
    >
      {!isReply && (
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Leave a Comment
        </h2>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Row: UserName + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              {...register("userName")}
              type="text"
              placeholder="JohnDoe"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.userName ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.userName && (
              <p className="text-xs text-red-500 mt-1">
                {errors.userName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="john@example.com"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* HomePage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Home Page{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register("homePage")}
            type="url"
            placeholder="https://yourwebsite.com"
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.homePage ? "border-red-300 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.homePage && (
            <p className="text-xs text-red-500 mt-1">
              {errors.homePage.message}
            </p>
          )}
        </div>

        {/* Text with toolbar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment <span className="text-red-500">*</span>
          </label>
          <HtmlToolbar
            textareaRef={textareaRef}
            onTextChange={handleTextChange}
          />
          <textarea
            {...textareaRegister}
            ref={(e) => {
              textareaFormRef(e);
              textareaRef.current = e;
            }}
            rows={isReply ? 3 : 5}
            placeholder="Write your comment... (HTML tags: <a>, <code>, <i>, <strong> are allowed)"
            className={`w-full px-3 py-2 text-sm border border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono resize-y ${
              errors.text ? "border-red-300 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.text && (
            <p className="text-xs text-red-500 mt-1">{errors.text.message}</p>
          )}
        </div>

        {/* File Upload */}
        <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />

        {/* CAPTCHA */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            CAPTCHA <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 border border-gray-300 rounded bg-white overflow-hidden">
              {captchaLoading ? (
                <div className="w-[200px] h-[60px] flex items-center justify-center text-sm text-gray-400">
                  Loading...
                </div>
              ) : captcha ? (
                <img
                  src={`data:image/png;base64,${captcha.imageBase64}`}
                  alt="CAPTCHA"
                  className="w-[200px] h-[60px] object-contain"
                />
              ) : (
                <div className="w-[200px] h-[60px] flex items-center justify-center text-sm text-red-400">
                  Failed to load
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={loadCaptcha}
              disabled={captchaLoading}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Refresh CAPTCHA"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 ${captchaLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <input
            {...register("captchaAnswer")}
            type="text"
            placeholder="Enter the text shown above"
            autoComplete="off"
            className={`w-full max-w-xs px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.captchaAnswer
                ? "border-red-300 bg-red-50"
                : "border-gray-300"
            }`}
          />
          {errors.captchaAnswer && (
            <p className="text-xs text-red-500 mt-1">
              {errors.captchaAnswer.message}
            </p>
          )}
        </div>

        {/* Preview toggle + submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || createComment.isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting || createComment.isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </span>
            ) : isReply ? (
              "Post Reply"
            ) : (
              "Post Comment"
            )}
          </button>
        </div>

        {/* Error display */}
        {createComment.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {(() => {
                const err = createComment.error;
                const detail =
                  err &&
                  typeof err === "object" &&
                  "response" in err &&
                  (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
                return detail || (err instanceof Error ? err.message : "Failed to post comment. Please try again.");
              })()}
            </p>
          </div>
        )}
      </form>

      {/* Preview section */}
      {showPreview && (
        <div className="mt-4">
          <CommentPreview text={watchText} userName={watchUserName} />
        </div>
      )}
    </div>
  );
}
