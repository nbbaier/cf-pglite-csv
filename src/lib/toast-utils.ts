import { toast } from "sonner";

type SuccessMessage<T> = string | ((result: T) => string | undefined);

type WithToastOptions<T> = {
	fallbackErrorMessage: string;
	successMessage?: SuccessMessage<T>;
	onSuccess?: (result: T) => void;
	onError?: (error: unknown) => void;
};

export async function withToast<T>(
	action: () => Promise<T>,
	options: WithToastOptions<T>,
): Promise<T> {
	try {
		const result = await action();
		options.onSuccess?.(result);

		const successMessage =
			typeof options.successMessage === "function"
				? options.successMessage(result)
				: options.successMessage;

		if (successMessage) {
			toast.success(successMessage);
		}

		return result;
	} catch (error) {
		options.onError?.(error);
		const message =
			error instanceof Error && error.message
				? error.message
				: options.fallbackErrorMessage;
		toast.error(message);
		throw error;
	}
}
