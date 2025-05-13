'use server';

import {z} from 'zod';
import {createClient} from '@/utils/supabase/server';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(formData: FormData) {
    const {customerId, amount, status} = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        const supabase = await createClient();
        const {error} = await supabase
            .from("invoices")
            .insert({customer_id: customerId, amount: amountInCents, date: date, status: status});

    } catch (error) {
        console.log(error);
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
    const {error} = await supabase
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
    const {error} = await supabase
        .from("invoices")
        .delete()
        .eq('id', id);
    revalidatePath('/dashboard/invoices');
}