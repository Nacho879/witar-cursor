-- Create user_location_settings table
CREATE TABLE IF NOT EXISTS user_location_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    require_location BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_location_settings_company_user 
ON user_location_settings(company_id, user_id);

-- Enable RLS
ALTER TABLE user_location_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own location settings" ON user_location_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Company owners can manage location settings" ON user_location_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE user_id = auth.uid()
            AND company_id = user_location_settings.company_id
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_location_settings_updated_at 
    BEFORE UPDATE ON user_location_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 