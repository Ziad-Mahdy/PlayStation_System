import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const supabaseService = {
  // ── Devices (معزولة لكل مشترك بـ clientPhone) ──
  async fetchDevices(clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return [];
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching client devices:', error);
        return [];
      }

      return (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isVIP: Boolean(d.is_vip),
        singlePrice: parseFloat(d.single_price) || 0,
        multiPrice: parseFloat(d.multi_price) || 0,
        status: d.status || 'free',
        session: d.session || null,
        clientPhone: d.client_phone,
      }));
    } catch (err) {
      console.error('fetchDevices exception:', err);
      return [];
    }
  },

  async insertDevice(device, clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return null;
    try {
      const payload = {
        client_phone: clientPhone,
        name: device.name.trim(),
        type: device.type,
        is_vip: device.isVIP,
        single_price: device.singlePrice,
        multi_price: device.multiPrice,
        status: device.status || 'free',
        session: device.session || null,
      };

      const { data, error } = await supabase
        .from('devices')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error inserting device:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('insertDevice exception:', err);
      return null;
    }
  },

  async updateDevice(id, updates) {
    if (!isSupabaseConfigured || !id) return null;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.isVIP !== undefined) payload.is_vip = updates.isVIP;
      if (updates.singlePrice !== undefined) payload.single_price = updates.singlePrice;
      if (updates.multiPrice !== undefined) payload.multi_price = updates.multiPrice;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.session !== undefined) payload.session = updates.session;

      const { data, error } = await supabase
        .from('devices')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating device:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('updateDevice exception:', err);
      return null;
    }
  },

  async deleteDevice(id) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) console.error('Error deleting device:', error);
    } catch (err) {
      console.error('deleteDevice exception:', err);
    }
  },

  // ── Categories ──
  async fetchCategories(clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return [];
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((c) => c.name);
    } catch (err) {
      return [];
    }
  },

  async addCategory(name, clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return;
    try {
      await supabase.from('categories').insert({ name: name.trim(), client_phone: clientPhone });
    } catch (err) {
      console.error('addCategory exception:', err);
    }
  },

  async deleteCategory(name, clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return;
    try {
      await supabase.from('categories').delete().eq('name', name).eq('client_phone', clientPhone);
    } catch (err) {
      console.error('deleteCategory exception:', err);
    }
  },

  // ── Products (البوفيه والمشروبات معزولة لكل مشترك) ──
  async fetchProducts(clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        category: p.category || 'مشروبات',
        clientPhone: p.client_phone,
      }));
    } catch (err) {
      return [];
    }
  },

  async insertProduct(product, clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return null;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          client_phone: clientPhone,
          name: product.name.trim(),
          price: product.price,
          category: product.category || 'مشروبات',
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting product:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('insertProduct exception:', err);
      return null;
    }
  },

  async updateProduct(id, updates) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category !== undefined) payload.category = updates.category;

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) console.error('Error updating product:', error);
    } catch (err) {
      console.error('updateProduct exception:', err);
    }
  },

  async deleteProduct(id) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('Error deleting product:', error);
    } catch (err) {
      console.error('deleteProduct exception:', err);
    }
  },

  // ── Completed Sessions / Invoices (الفواتير معزولة لكل مشترك) ──
  async fetchCompletedSessions(clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return [];
    try {
      const { data, error } = await supabase
        .from('completed_sessions')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((s) => ({
        id: s.id,
        deviceName: s.device_name,
        deviceType: s.device_type,
        isVIP: Boolean(s.is_vip),
        customerName: s.customer_name || '',
        startTime: Number(s.start_time),
        endTime: Number(s.end_time),
        durationSeconds: s.duration_seconds,
        mode: s.mode,
        timeType: s.time_type,
        targetMinutes: s.target_minutes,
        timeCost: parseFloat(s.time_cost) || 0,
        ordersCost: parseFloat(s.orders_cost) || 0,
        total: parseFloat(s.total) || 0,
        clientPhone: s.client_phone,
      }));
    } catch (err) {
      return [];
    }
  },

  async addCompletedSession(session, clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return null;
    try {
      const payload = {
        client_phone: clientPhone,
        device_name: session.deviceName,
        device_type: session.deviceType,
        is_vip: session.isVIP,
        customer_name: session.customerName || '',
        start_time: session.startTime,
        end_time: session.endTime,
        duration_seconds: session.durationSeconds,
        mode: session.mode,
        time_type: session.timeType || 'open',
        target_minutes: session.targetMinutes || null,
        time_cost: session.timeCost,
        orders_cost: session.ordersCost,
        total: session.total,
      };

      const { data, error } = await supabase
        .from('completed_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) console.error('Error adding completed session to Supabase:', error);
      return data;
    } catch (err) {
      console.error('addCompletedSession exception:', err);
      return null;
    }
  },

  async clearCompletedSessions(clientPhone) {
    if (!isSupabaseConfigured || !clientPhone) return;
    try {
      await supabase
        .from('completed_sessions')
        .delete()
        .eq('client_phone', clientPhone);
    } catch (err) {
      console.error('clearCompletedSessions exception:', err);
    }
  },

  // ── Realtime Listener ──
  subscribeToChanges(onChange) {
    if (!isSupabaseConfigured || !supabase) return () => {};
    try {
      const channel = supabase
        .channel('cafe-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'devices' },
          (p) => onChange?.('devices', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          (p) => onChange?.('categories', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (p) => onChange?.('products', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'completed_sessions' },
          (p) => onChange?.('completed_sessions', p)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Supabase realtime error:', err);
      return () => {};
    }
  },
};
