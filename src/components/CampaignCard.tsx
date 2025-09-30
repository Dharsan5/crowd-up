import {
    Badge,
    Card,
    createStyles,
    Flex,
    getStylesRef,
    Group,
    Image,
    PaperProps,
    Progress,
    Stack,
    Text,
} from '@mantine/core';
import {ICampaign} from "../types";
import {Link} from "react-router-dom";

const useStyles = createStyles((theme) => ({
    card: {
        position: 'relative',
        padding: 0,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
        border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
        overflow: 'hidden',
        cursor: 'pointer',

        [`&:hover .${getStylesRef('image')}`]: {
            transform: 'scale(1.05)',
        },

        '&:hover': {
            boxShadow: theme.shadows.xl,
            transform: 'translateY(-4px)',
            border: `1px solid ${theme.colors.primary[4]}`,
            transition: 'all 200ms ease',
        }
    },

    title: {
        marginTop: theme.spacing.md,
    },

    image: {
        ref: getStylesRef('image'),
        transition: 'transform 150ms ease',
    }
}));

interface IProps extends PaperProps {
    data: ICampaign
    showActions?: boolean
}

const CampaignCard = ({data, showActions}: IProps) => {
    const {classes} = useStyles();
    const {
        mainImage,
        id,
        title,
        amountRaised,
        daysLeft,
        contributors,
        description,
        category,
        country
    } = data;
    const linkProps = {to: `/campaigns/${id}`, rel: 'noopener noreferrer'};

    return (
        <Card radius="md" shadow="lg" component={Link} {...linkProps} className={classes.card}>
            <Card.Section>
                <Image 
                    src={mainImage} 
                    height={220} 
                    fit="cover"
                    withPlaceholder
                    placeholder={<Text align="center">Campaign Image</Text>}
                    className={classes.image}
                />
            </Card.Section>

            <Card.Section p="lg">
                <Stack spacing="sm">
                    <Text className={classes.title} lineClamp={2} fw={600} size="md">
                        {title}
                    </Text>

                    <Group position="apart">
                        <Text size="xs" transform="uppercase" color="dimmed" fw={700}>{country}</Text>
                        <Badge variant="dot" color="secondary">{category}</Badge>
                    </Group>

                    {showActions && <Text lineClamp={3} size="sm">{description}</Text>}

                    <Progress value={daysLeft}/>

                    <Flex justify="space-between">
                        <Text><b>{amountRaised}</b> raised</Text>
                        <Text><b>{contributors}</b> donations</Text>
                    </Flex>

                    {/*{showActions && <Button>Donate Now</Button>}*/}
                </Stack>
            </Card.Section>
        </Card>
    );
};

export default CampaignCard;
