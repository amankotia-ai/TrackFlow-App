-- Environment Components Feature
-- Allows users to save and reuse CSS selectors and other component references

-- Create environment_components table
CREATE TABLE IF NOT EXISTS public.environment_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  component_type TEXT NOT NULL CHECK (component_type IN ('css_selector', 'url', 'text', 'custom')),
  value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_environment_components_user_id ON public.environment_components(user_id);
CREATE INDEX IF NOT EXISTS idx_environment_components_type ON public.environment_components(component_type);
CREATE INDEX IF NOT EXISTS idx_environment_components_tags ON public.environment_components USING GIN(tags);

-- Enable RLS (Row Level Security)
ALTER TABLE public.environment_components ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own environment components
CREATE POLICY "Users can view own environment components"
  ON public.environment_components
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own environment components
CREATE POLICY "Users can insert own environment components"
  ON public.environment_components
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own environment components
CREATE POLICY "Users can update own environment components"
  ON public.environment_components
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own environment components
CREATE POLICY "Users can delete own environment components"
  ON public.environment_components
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_environment_component_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS environment_components_updated_at ON public.environment_components;
CREATE TRIGGER environment_components_updated_at
  BEFORE UPDATE ON public.environment_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_environment_component_updated_at();

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_component_usage(component_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.environment_components
  SET usage_count = usage_count + 1
  WHERE id = component_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.environment_components TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_component_usage TO authenticated;

-- Insert some example components (optional - for demo purposes)
-- These would typically be created by users, but we can add some common patterns
COMMENT ON TABLE public.environment_components IS 'Stores reusable component references like CSS selectors for use in workflows';

