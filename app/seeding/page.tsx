import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/server';
import {customers, invoices, revenue, users} from '../lib/placeholder-data';


export default async function Seed() {

    const supabase = await createClient();
    const insertedUsers = seedUsers(supabase);
    const insertedCustomers = seedCustomers(supabase);
    const insertedInvoices = seedInvoices(supabase);
    const insertRevenus = seedRevenus(supabase);
    const { data: invoice } = await supabase.from("invoices").select(`
    id,
    amount, 
    customer_id (
      name
    )`).eq('amount', 666);
    console.log(invoice);

    return <pre>{JSON.stringify(invoice, null, 2)}</pre>
}

async function seedUsers(supabase) {
    const insertedUsers = await Promise.all(
        users.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const { error } = await supabase
                .from('users')
                .insert({ id: user.id, name: user.name, email: user.email, password: hashedPassword });
            return error;
        }),
    );

    return insertedUsers;
}

async function seedCustomers(supabase) {
    const insertedCustomers = await Promise.all(
        customers.map(async (customer) => {
            const { error } = await supabase
                .from('customers')
                .insert({ id: customer.id, name: customer.name, email: customer.email, image_url: customer.image_url });
            return error;
        })
    )
    return insertedCustomers;
}

async function seedInvoices(supabase) {
    const insertedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
            const { error } = await supabase
                .from('invoices')
                .insert({ customer_id: invoice.customer_id, amount: invoice.amount, status: invoice.status, date: invoice.date });
            return error;
        })
    )
    return insertedInvoices;
}

async function seedRevenus(supabase) {
    const insertedRevenus = await Promise.all(
        revenue.map(async (revenue) => {
            const { error } = await supabase
                .from('revenue')
                .insert({ month: revenue.month, revenue: revenue.revenue });
            return error;
        })
    )
    return insertedRevenus;
}