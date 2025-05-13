'use server';

import {z} from 'zod';
import {createClient} from '@/utils/supabase/server';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields...'
        };
    }

    const amountInCents = formData.get('amount') * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        const supabase = await createClient();
        const {} = await supabase
            .from("invoices")
            .insert({customer_id: formData.get('customerId'), amount: amountInCents, date: date, status: formData.get('status')});

    } catch (error) {
        console.log(error);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function updateInvoice(id: string, formData: FormData) {

    const {customerId, amount, status} = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    const supabase = await createClient();
    const {} = await supabase
        .from("invoices")
        .update({customer_id: customerId, amount: amountInCents, status: status})
        .eq('id', id);
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {

    // @todo remove error to allow removing invoices
    throw new Error('Failed to Delete Invoice');

    const supabase = await createClient();
    const {} = await supabase
        .from("invoices")
        .delete()
        .eq('id', id);
    revalidatePath('/dashboard/invoices');
}

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}