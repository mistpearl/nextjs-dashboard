import {createClient} from '@/utils/supabase/server';
import {CustomerField, CustomersTableType, InvoiceForm, InvoicesTable, LatestInvoiceRaw,} from './definitions';
import {formatCurrency} from './utils';
import {invoices} from "@/app/lib/placeholder-data";

export async function fetchRevenue() {
    try {
        const supabase = await createClient();
        const {data: revenus} = await supabase.from("revenue").select();
        return revenus;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch revenue data.');
    }
}

export async function fetchLatestInvoices() {
    try {
        const supabase = await createClient();
        const {data: invoices} = await supabase.from("invoices").select(`id, amount, date, customer_id(name, image_url, email)`).order('date', { ascending: false }).limit(5);
        const latestInvoices = invoices.map((invoice) => ({
            ...invoice,
            amount: formatCurrency(invoice.amount),
        }));
        return latestInvoices;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch the latest invoices.');
    }
}

export async function fetchCardData() {
    try {
        const supabase = await createClient();

        const numberOfInvoices = getNumberOfInvoices(supabase);
        const numberOfCustomers = getNumberOfCustomers(supabase);
        const totalPaidInvoices = getTotalPaidInvoices(supabase);
        const totalPendingInvoices = getTotalPendingInvoices(supabase);

        return {
            numberOfCustomers,
            numberOfInvoices,
            totalPaidInvoices,
            totalPendingInvoices,
        };
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch card data.');
    }
}

async function getNumberOfInvoices(supabase) {
    const { count, error } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    return count;
}

async function getNumberOfCustomers(supabase) {
    const { count, error } = await supabase.from("customers").select('*', { count : 'exact', head: true });
    return count;
}

async function getTotalPaidInvoices(supabase) {
    const { data, error } = await supabase.from("invoices").select('amount').eq('status', 'paid');
    let totalPaidInvoices = 0;
    data.forEach((invoice) => {
        totalPaidInvoices = totalPaidInvoices + invoice.amount;
    });
    return totalPaidInvoices + ' €';
}

async function getTotalPendingInvoices(supabase) {
    const { data, error } = await supabase.from("invoices").select('amount').eq('status', 'pending');
    let totalPendingInvoices = 0;
    data.forEach((invoice) => {
        totalPendingInvoices = totalPendingInvoices + invoice.amount;
    });
    return totalPendingInvoices + ' €';
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
    query: string,
    currentPage: number,
) {
    const supabase = await createClient();
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const offsetB = offset + ITEMS_PER_PAGE;

    const {data: invoices} = await supabase
        .from("invoices")
        .select(`id, amount, date, status, customer_id(name, image_url, email)`)
        //.textSearch("status", query)
        .order('date', {ascending: false})
        .range(offset, offsetB)
        .limit(ITEMS_PER_PAGE);


    if(query != '') {
        const {data: invoices} = await supabase
            .from("invoices")
            .select(`id, amount, date, status, customer_id(name, image_url, email)`)
            .textSearch("amount", query)
            .order('date', {ascending: false})
            .range(offset, offsetB)
            .limit(ITEMS_PER_PAGE);
    }
    console.log(invoices);

    return invoices;
}


export async function fetchInvoicesPages(query: string) {
    try {
        const supabase = await createClient();
        const { count, error } = await supabase
            .from("invoices")
            .select('*', { count : 'exact', head: true })
            .textSearch("status", query);

        const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
        return totalPages;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch total number of invoices.');
    }
}

export async function fetchInvoiceById(id: string) {
    try {
        const supabase = await createClient();
        const { data: invoice } = await supabase
            .from("invoices")
            .select()
            .eq('id', id)
            .limit(1);

        if(invoice[0]) {
            invoice[0].amount = invoice[0].amount / 100;
        }
        return invoice[0];
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch invoice.');
    }
}

export async function fetchCustomers() {
    try {
        const supabase = await createClient();
        const { data: customers } = await supabase
            .from("customers")
            .select();
        return customers;
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch all customers.');
    }
}

export async function fetchFilteredCustomers(query: string) {
    try {
        const data = await sql<CustomersTableType[]>`
            SELECT customers.id,
                   customers.name,
                   customers.email,
                   customers.image_url,
                   COUNT(invoices.id)                                                         AS total_invoices,
                   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
                   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END)    AS total_paid
            FROM customers
                     LEFT JOIN invoices ON customers.id = invoices.customer_id
            WHERE customers.name ILIKE ${`%${query}%`}
               OR
                customers.email ILIKE ${`%${query}%`}
            GROUP BY customers.id, customers.name, customers.email, customers.image_url
            ORDER BY customers.name ASC
        `;

        const customers = data.map((customer) => ({
            ...customer,
            total_pending: formatCurrency(customer.total_pending),
            total_paid: formatCurrency(customer.total_paid),
        }));

        return customers;
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch customer table.');
    }
}
