'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { quizApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const createQuiz = useMutation({
    mutationFn: () =>
      quizApi.create({
        title,
        description: description || undefined,
        isPublic,
      }),
    onSuccess: (res) => {
      toast.success('Quiz created');
      router.push(`/quizzes/${res.data.id}/edit`);
    },
    onError: () => toast.error('Failed to create quiz'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Create Quiz</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with quiz metadata, then add questions on the next screen.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            placeholder="e.g. NSO Warm-up Round"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-32 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            placeholder="Optional notes for hosts"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span className="text-sm">Allow this quiz to be public</span>
        </label>

        <button
          onClick={() => createQuiz.mutate()}
          disabled={createQuiz.isPending || title.trim().length < 3}
          className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {createQuiz.isPending ? 'Creating...' : 'Create and continue'}
        </button>
      </div>
    </div>
  );
}

