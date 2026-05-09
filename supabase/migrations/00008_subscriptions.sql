-- ===================== SUBSCRIPTION PLANS =====================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'ZAR',
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active plans viewable by authenticated"
  ON public.subscription_plans FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_plans (name, description, price, currency, interval, features, sort_order) VALUES
  ('Free', 'Basic access to the community', 0, 'ZAR', 'month', '["Browse feed", "View events", "Join public circles", "Basic search"]', 0),
  ('Pro', 'Full access for professionals', 29900, 'ZAR', 'month', '["Unlimited messaging", "Premium mentor matching", "Private circles", "Event discounts", "Anonymous Q&A"]', 1),
  ('Enterprise', 'For organizations and teams', 99900, 'ZAR', 'month', '["Everything in Pro", "Team management", "Analytics dashboard", "Custom branding", "Priority support", "API access"]', 2);

-- ===================== USER SUBSCRIPTIONS =====================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_subscription ON public.subscriptions(user_id) WHERE status = 'active';

-- ===================== TIPS =====================
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  message TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tips"
  ON public.tips FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ===================== FUNCTIONS =====================
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  plan_name TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.plan_id, sp.name, s.status, s.current_period_end
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_subscription()
RETURNS VOID AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
